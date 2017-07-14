var mongoose = require('mongoose'),
    _        = require('lodash'),
    config   = require('../config/config.js');

var ObjectId = mongoose.Schema.ObjectId;

var WatcherSchema = new mongoose.Schema({
    userName: String,
    agencyName: String,
    service: String,
    match: String
}, {
    collection: 'sma_procwatcher'
});

// Container for the watcher intervals
var processIntervals = {};

WatcherSchema.statics.getWatcher = function(criteria, callback){
    this.findOne(criteria).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        return watcher ? callback(undefined, watcher) : callback(undefined, undefined);
    });
};

WatcherSchema.statics.getWatcherSet = function(criteria, callback){
    this.find(criteria).exec(function (err, watchers) {
        if(err) {
            return callback(err);
        }
        return watchers ? callback(undefined, watchers) : callback(undefined, undefined);
    });
};

WatcherSchema.statics.isRunning = function(watcher) {
    return processIntervals[watcher['_id']];
}

WatcherSchema.statics.addInterval = function(watcher, interval, criteria, callback){
    var saveWatcher = function() {
        watcher.save(function (saveErr) {
            if(saveErr) {
                return callback(saveErr);
            }
            else {
                // Set object
                processIntervals[watcher['_id']] = interval;
                return callback(undefined, watcher);
            }
        });
    }
    if(watcher && _.isObject(watcher)) {
        return saveWatcher();
    }
    this.getWatcher( criteria ).exec(function (err, watcher) {
        if(err) {
            return callback(err);
        }
        return saveWatcher();
    });
};

WatcherSchema.statics.clearInterval = function(criteria, callback) {
    callback = callback || function() {};
    this.getWatcherSet(criteria, function(err, watchers) {
        if(err) {
            callback(err);
        }
        _.map(watchers, function(watcher) {
            console.log(watcher);
            console.log(processIntervals[watcher['_id']]);
            clearInterval(processIntervals[watcher['_id']]);
            watcher.remove();
        });
        callback(null, 'Clear watchers complete');
    });
};

WatcherSchema.statics.resetAll = function(callback){
    this.find().remove().exec(function(err) {
        if(err) {
            return callback(err);
        }
        console.log('deleted');
        return callback(undefined);
    });
};

module.exports = mongoose.model('Watcher', WatcherSchema);