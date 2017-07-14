var mongoose = require('mongoose'),
    config   = require("./config");

// Use native
mongoose.Promise = global.Promise;
// Connect
mongoose.connect(config.db);

// Models
require(__base + "model/Post.js");
require(__base + "model/User.js");
