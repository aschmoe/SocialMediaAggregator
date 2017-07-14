"use strict";

global.__base = __dirname + '/';

let express = require('express'),
    cors = require('cors'),
    http = require('http'),
    https = require('https'),
    reqLogger = require('morgan'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    basicAuth = require('basic-auth');

// Load config
require(__base + 'config/db');
let config = require(__base + 'config/config');

// Load logging
let logger = require(__base + 'config/logger');

// Load submodules
let AggregatorController = require(__base + 'social_media_aggregator/AggregatorController'),
    ApiRoutes = require(__base + 'api/routes/ApiRoutes'),
    UserRoutes = require(__base + 'api/routes/UserRoutes');

let app = express();

global.routeAuth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.send(401);
  };

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };

  if (user.name ===  process.env.API_AUTH_USER && user.pass === process.env.API_AUTH_PASS) {
    return next();
  } else {
    return unauthorized(res);
  };
};

app.use(cors({
    'methods': ['GET', 'POST']
}));
app.use(reqLogger('dev'));
// app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
    secret: 'asd13asd786youtasvasdas3a78vwe123',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.json()); // for parsing application/json

// Test home route
app.get('/', function(req, res) {
    res.send("Hello");
    // AggregatorController.extractData();
});

// Init http
let httpServer = http.createServer(app);
httpServer.listen(config.port);

// Init https
if(process.env.SSL_KEY && process.env.SSL_CRT) {
  const credentials = {
    key: process.env.SSL_KEY, 
    cert: process.env.SSL_CRT
  };
  let httpsServer = https.createServer(credentials, app);
  httpsServer.listen(config.https_port);
}

AggregatorController.startExecution();

// Routes
app.use('/api', ApiRoutes);
app.use('/user', UserRoutes);

module.exports = app;
