const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
const express = require('express');
const pino = require('pino');
const expPino = require('express-pino-logger');
// Prometheus
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
});

const logger = pino({
    level: 'info',
    prettyPrint: false,
    useLevelLabels: true
});
const expLogger = expPino({
    logger: logger
});

// MongoDB
var db;
var collection;
var mongoConnected = false;

const app = express();

app.use(expLogger);

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration = diff[0] + diff[1] / 1e9;
        const route = req.route ? (req.baseUrl ? req.baseUrl + req.route.path : req.route.path) : 'unmatched';
        const method = req.method;
        const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';
        httpRequestsTotal.inc({ method, route, status_code: statusCode });
        httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, duration);
    });
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/health', (req, res) => {
    var stat = {
        app: 'OK',
        mongo: mongoConnected
    };
    res.json(stat);
});

// Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// all products
app.get('/products', (req, res) => {
    if(mongoConnected) {
        collection.find({}).toArray().then((products) => {
            res.json(products);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not avaiable');
    }
});

// product by SKU
app.get('/product/:sku', (req, res) => {
    if(mongoConnected) {
        // optionally slow this down
        const delay = process.env.GO_SLOW || 0;
        setTimeout(() => {
        collection.findOne({sku: req.params.sku}).then((product) => {
            req.log.info('product', product);
            if(product) {
                res.json(product);
            } else {
                res.status(404).send('SKU not found');
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
        }, delay);
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// products in a category
app.get('/products/:cat', (req, res) => {
    if(mongoConnected) {
        collection.find({ categories: req.params.cat }).sort({ name: 1 }).toArray().then((products) => {
            if(products) {
                res.json(products);
            } else {
                res.status(404).send('No products for ' + req.params.cat);
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not avaiable');
    }
});

// all categories
app.get('/categories', (req, res) => {
    if(mongoConnected) {
        collection.distinct('categories').then((categories) => {
            res.json(categories);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// search name and description
app.get('/search/:text', (req, res) => {
    if(mongoConnected) {
        collection.find({ '$text': { '$search': req.params.text }}).toArray().then((hits) => {
            res.json(hits);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoURL = process.env.MONGO_URL || 'mongodb://mongodb:27017/catalogue';
        mongoClient.connect(mongoURL, (error, client) => {
            if(error) {
                reject(error);
            } else {
                db = client.db('catalogue');
                collection = db.collection('products');
                resolve('connected');
            }
        });
    });
}

// mongodb connection retry loop
function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
        logger.info('MongoDB connected');
    }).catch((e) => {
        logger.error('ERROR', e);
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

// fire it up!
const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port', port);
});

