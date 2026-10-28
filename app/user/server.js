const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const redis = require('redis');
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

// MongoDB
var db;
var usersCollection;
var ordersCollection;
var mongoConnected = false;

const logger = pino({
    level: 'info',
    prettyPrint: false,
    useLevelLabels: true
});
const expLogger = expPino({
    logger: logger
});

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

// use REDIS INCR to track anonymous users
app.get('/uniqueid', (req, res) => {
    // get number from Redis
    redisClient.incr('anonymous-counter', (err, r) => {
        if(!err) {
            res.json({
                uuid: 'anonymous-' + r
            });
        } else {
            req.log.error('ERROR', err);
            res.status(500).send(err);
        }
    });
});

// check user exists
app.get('/check/:id', (req, res) => {
    if(mongoConnected) {
        usersCollection.findOne({name: req.params.id}).then((user) => {
            if(user) {
                res.send('OK');
            } else {
                res.status(404).send('user not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.send(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// return all users for debugging only
app.get('/users', (req, res) => {
    if(mongoConnected) {
        usersCollection.find().toArray().then((users) => {
            res.json(users);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/login', (req, res) => {
    req.log.info('login', req.body);
    if(req.body.name === undefined || req.body.password === undefined) {
        req.log.warn('credentails not complete');
        res.status(400).send('name or passowrd not supplied');
    } else if(mongoConnected) {
        usersCollection.findOne({
            name: req.body.name,
        }).then((user) => {
            req.log.info('user', user);
            if(user) {
                if(user.password == req.body.password) {
                    res.json(user);
                } else {
                    res.status(404).send('incorrect password');
                }
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// TODO - validate email address format
app.post('/register', (req, res) => {
    req.log.info('register', req.body);
    if(req.body.name === undefined || req.body.password === undefined || req.body.email === undefined) {
        req.log.warn('insufficient data');
        res.status(400).send('insufficient data');
    } else if(mongoConnected) {
        // check if name already exists
        usersCollection.findOne({name: req.body.name}).then((user) => {
            if(user) {
                req.log.warn('user already exists');
                res.status(400).send('name already exists');
            } else {
                // create new user
                usersCollection.insertOne({
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email
                }).then((r) => {
                    req.log.info('inserted', r.result);
                    res.send('OK');
                }).catch((e) => {
                    req.log.error('ERROR', e);
                    res.status(500).send(e);
                });
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/order/:id', (req, res) => {
    req.log.info('order', req.body);
    // only for registered users
    if(mongoConnected) {
        usersCollection.findOne({
            name: req.params.id
        }).then((user) => {
            if(user) {
                // found user record
                // get orders
                ordersCollection.findOne({
                    name: req.params.id
                }).then((history) => {
                    if(history) {
                        var list = history.history;
                        list.push(req.body);
                        ordersCollection.updateOne(
                            { name: req.params.id },
                            { $set: { history: list }}
                        ).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            req.log.error(e);
                            res.status(500).send(e);
                        });
                    } else {
                        // no history
                        ordersCollection.insertOne({
                            name: req.params.id,
                            history: [ req.body ]
                        }).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            req.log.error(e);
                            res.status(500).send(e);
                        });
                    }
                }).catch((e) => {
                    req.log.error(e);
                    res.status(500).send(e);
                });
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/history/:id', (req, res) => {
    if(mongoConnected) {
        ordersCollection.findOne({
            name: req.params.id
        }).then((history) => {
            if(history) {
                res.json(history);
            } else {
                res.status(404).send('history not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// connect to Redis
var redisOptions = {
    host: process.env.REDIS_HOST || 'redis'
};
if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
}
var redisClient = redis.createClient(redisOptions);

redisClient.on('error', (e) => {
    logger.error('Redis ERROR', e);
});
redisClient.on('ready', (r) => {
    logger.info('Redis READY', r);
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoURL = process.env.MONGO_URL || 'mongodb://mongodb:27017/users';
        mongoClient.connect(mongoURL, (error, client) => {
            if(error) {
                reject(error);
            } else {
                db = client.db('users');
                usersCollection = db.collection('users');
                ordersCollection = db.collection('orders');
                resolve('connected');
            }
        });
    });
}

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
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port', port);
});

