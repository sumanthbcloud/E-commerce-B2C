package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	ot "github.com/opentracing/opentracing-go"
	"github.com/opentracing/opentracing-go/ext"
	otlog "github.com/opentracing/opentracing-go/log"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/streadway/amqp"
)

const (
	Service  = "dispatch"
	Exchange = "ecommerce-b2c"
)

var (
	amqpUri          string
	rabbitChan       *amqp.Channel
	rabbitCloseError chan *amqp.Error
	rabbitReady      chan bool
	errorPercent     int

	messagesConsumedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dispatch_messages_consumed_total",
			Help: "Total number of RabbitMQ messages consumed by dispatch worker",
		},
		[]string{"queue"},
	)

	ordersProcessedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "dispatch_orders_processed_total",
			Help: "Total number of orders processed by dispatch worker",
		},
		[]string{"status"},
	)

	messageProcessingDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "dispatch_message_processing_duration_seconds",
			Help:    "Duration of dispatch order processing in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"status"},
	)
)

func init() {
	prometheus.MustRegister(messagesConsumedTotal)
	prometheus.MustRegister(ordersProcessedTotal)
	prometheus.MustRegister(messageProcessingDuration)
}

func connectToRabbitMQ(uri string) *amqp.Connection {
	for {
		conn, err := amqp.Dial(uri)
		if err == nil {
			return conn
		}

		log.Println(err)
		log.Printf("Reconnecting to %s\n", uri)
		time.Sleep(1 * time.Second)
	}
}

func rabbitConnector(uri string) {
	var rabbitErr *amqp.Error

	for {
		rabbitErr = <-rabbitCloseError
		if rabbitErr == nil {
			return
		}

		log.Printf("Connecting to %s\n", amqpUri)
		rabbitConn := connectToRabbitMQ(uri)
		rabbitConn.NotifyClose(rabbitCloseError)

		var err error

		// create mappings here
		rabbitChan, err = rabbitConn.Channel()
		failOnError(err, "Failed to create channel")

		// create exchange
		err = rabbitChan.ExchangeDeclare(Exchange, "direct", true, false, false, false, nil)
		failOnError(err, "Failed to create exchange")

		// create queue
		queue, err := rabbitChan.QueueDeclare("orders", true, false, false, false, nil)
		failOnError(err, "Failed to create queue")

		// bind queue to exchange
		err = rabbitChan.QueueBind(queue.Name, "orders", Exchange, false, nil)
		failOnError(err, "Failed to bind queue")

		// signal ready
		rabbitReady <- true
	}
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s : %s", msg, err)
	}
}

func getOrderId(order []byte) string {
	id := "unknown"
	var f interface{}
	err := json.Unmarshal(order, &f)
	if err == nil {
		m := f.(map[string]interface{})
		id = m["orderid"].(string)
	}

	return id
}

func createSpan(headers map[string]interface{}, order string) {
	start := time.Now()

	// headers is map[string]interface{}
	// carrier is map[string]string
	carrier := make(ot.TextMapCarrier)
	// convert by copying k, v
	for k, v := range headers {
		carrier[k] = v.(string)
	}

	// get the order id
	log.Printf("order %s\n", order)

	// opentracing
	var span ot.Span
	tracer := ot.GlobalTracer()
	spanContext, err := tracer.Extract(ot.HTTPHeaders, carrier)
	if err == nil {
		log.Println("Creating child span")
		// create child span
		span = tracer.StartSpan("getOrder", ot.ChildOf(spanContext))
	} else {
		log.Println(err)
		log.Println("Failed to get context from headers")
		log.Println("Creating root span")
		// create root span
		span = tracer.StartSpan("getOrder")
	}

	span.SetTag(string(ext.SpanKind), ext.SpanKindConsumerEnum)
	span.SetTag(string(ext.MessageBusDestination), Exchange)
	span.SetTag("exchange", Exchange)
	span.SetTag("sort", "consume")
	span.SetTag("address", "rabbitmq")
	span.SetTag("key", "orders")
	span.LogFields(otlog.String("orderid", order))
	defer span.Finish()

	status := "success"
	time.Sleep(time.Duration(42+rand.Int63n(42)) * time.Millisecond)
	if rand.Intn(100) < errorPercent {
		status = "error"
		span.SetTag("error", true)
		span.LogFields(
			otlog.String("error.kind", "Exception"),
			otlog.String("message", "Failed to dispatch to SOP"))
		log.Println("Span tagged with error")
	}

	processSale(span)

	duration := time.Since(start).Seconds()
	ordersProcessedTotal.WithLabelValues(status).Inc()
	messageProcessingDuration.WithLabelValues(status).Observe(duration)
}

func processSale(parentSpan ot.Span) {
	tracer := ot.GlobalTracer()
	span := tracer.StartSpan("processSale", ot.ChildOf(parentSpan.Context()))
	defer span.Finish()
	span.SetTag(string(ext.SpanKind), "intermediate")
	span.LogFields(otlog.String("info", "Order sent for processing"))
	time.Sleep(time.Duration(42+rand.Int63n(42)) * time.Millisecond)
}

func startMetricsServer() {
	metricsPort := os.Getenv("METRICS_PORT")
	if metricsPort == "" {
		metricsPort = "8080"
	}

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"OK"}`))
	})

	server := &http.Server{
		Addr:         ":" + metricsPort,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Starting metrics and health server on :%s", metricsPort)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("Metrics server error: %v", err)
	}
}

func main() {
	rand.Seed(time.Now().Unix())

	// Start metrics and health HTTP server
	go startMetricsServer()

	// Init amqpUri
	// get host and credentials from environment
	amqpHost, ok := os.LookupEnv("AMQP_HOST")
	if !ok {
		amqpHost = "rabbitmq"
	}
	amqpUser := os.Getenv("AMQP_USER")
	amqpPass := os.Getenv("AMQP_PASS")
	amqpUri = fmt.Sprintf("amqp://%s:%s@%s:5672/", amqpUser, amqpPass, amqpHost)

	// get error threshold from environment
	errorPercent = 0
	epct, ok := os.LookupEnv("DISPATCH_ERROR_PERCENT")
	if ok {
		epcti, err := strconv.Atoi(epct)
		if err == nil {
			if epcti > 100 {
				epcti = 100
			}
			if epcti < 0 {
				epcti = 0
			}
			errorPercent = epcti
		}
	}
	log.Printf("Error Percent is %d\n", errorPercent)

	// MQ error channel
	rabbitCloseError = make(chan *amqp.Error)

	// MQ ready channel
	rabbitReady = make(chan bool)

	go rabbitConnector(amqpUri)

	rabbitCloseError <- amqp.ErrClosed

	go func() {
		for {
			// wait for rabbit to be ready
			ready := <-rabbitReady
			log.Printf("Rabbit MQ ready %v\n", ready)

			// subscribe to bound queue
			msgs, err := rabbitChan.Consume("orders", "", true, false, false, false, nil)
			failOnError(err, "Failed to consume")

			for d := range msgs {
				messagesConsumedTotal.WithLabelValues("orders").Inc()
				log.Printf("Order %s\n", d.Body)
				log.Printf("Headers %v\n", d.Headers)
				id := getOrderId(d.Body)
				go createSpan(d.Headers, id)
			}
		}
	}()

	log.Println("Waiting for messages")
	select {}
}
