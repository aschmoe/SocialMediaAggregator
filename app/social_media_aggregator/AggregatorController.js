"use strict";

var _ = require('lodash'),
    config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    FacebookAggregator = require('./data_extractors/FacebookAggregator'),
    TwitterAggregator = require('./data_extractors/TwitterAggregator'),
    InstagramAggregator = require('./data_extractors/InstagramAggregator'),
    YoutubeAggregator = require('./data_extractors/YoutubeAggregator'),
    SocrataAggregator = require('./data_extractors/SocrataAggregator'),
    FoursquareAggregator = require('./data_extractors/FoursquareAggregator'),
    SeeClickFixAggregator = require('./data_extractors/SeeClickFixAggregator'),
    RSSAggregator = require('./data_extractors/RSSAggregator'),
    ICalendarAggregator = require('./data_extractors/ICalendarAggregator'),
    YelpAggregator = require('./data_extractors/YelpAggregator'),
    GtfsAggregator = require('./data_extractors/GtfsAggregator'),
    ElectionPollingAggregator = require('./data_extractors/ElectionPollingAggregator'),
    User = require(__base + 'model/User'),
    Post = require(__base + 'model/Post'),
    Watcher = require(__base + 'model/Watcher');

var CRITERIA_TYPE = {
    HASHTAG : 'hashtag',
    ACCOUNT : 'account'
}

var staggering = 0;

exports.startExecution = function(){
    var $that = this;
    // Reset watcher list on run
    Watcher.resetAll(function() {
        $that.extractData();
    });
}

// Runs execution on a interval
exports.runWithTimeout = function(timeout, authenticate, execute){
    // Timeout
    timeout = timeout || config.app.frequency;
    timeout = timeout * 1000;
    // Deal with artbitrary node timeout limit
    if(timeout > 2000000000) {
        timeout = 2000000000;
    }
    // Function to run
    var executeQuery = function() {
        if(authenticate!=null){
            authenticate(function(){
                console.log('authenticate: execute');
                execute();
            });
        } else {
            console.log('NO authenticate: execute');
            execute();
        }
    };
    // Run first time
    executeQuery();

    // Set interval
    return setInterval(function(){
        executeQuery();
    }, timeout);
}

// Runs execution based on watcher object in database
// Will not run again if already running
exports.runWithWatcher = function(userName, agencyName, match, platform, timeout, authenticate, execute) {
    var $that    = this;
    staggering = staggering + 3000;
    console.log(staggering);
    setTimeout(function() {
        
        var addCriteria = function(criteria) {
            criteria = criteria || {};
            criteria['userName'] = userName; 
            criteria['agencyName'] =  agencyName; 
            criteria['match'] =  match;
            criteria['service'] =  platform;
            return criteria
        }

        
        var criteria = addCriteria();

        // Get running, or create new
        Watcher.getWatcher(criteria, function(err, watcher) {
            if(err) {
                return logger.log('error', 'Error running watcher for account: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
            }
            // No watcher, so create one
            else if(!watcher || !_.isObject(watcher)){
               watcher = new Watcher();
               watcher = addCriteria(watcher);
            }
            // Not running yet, so run
            if(!Watcher.isRunning(watcher)) {
                var interval = $that.runWithTimeout(timeout, authenticate, execute);
                Watcher.addInterval(watcher, interval, null, function(addErr, watcher) {
                    if(addErr) {
                        return logger.log('error', 'Error running watcher for account: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
                    }
                    logger.log('info', 'Success running watcher for account: %s, user: %s, agency: %s, service: %s', match, userName, agencyName, platform);
                });
            }
        });
    }, staggering);
}

var extractDataForUser = function(user) {
    _.forEach(user.agencies, function(agency) {
        if(agency.facebook["feeds"].length) {
            FacebookAggregator.aggregateData(user.name, agency);
        }

        if(agency.twitter["feeds"].length) {
            TwitterAggregator.aggregateData(user.name, agency);
        }

        if(agency.instagram['feeds'].length) {
            InstagramAggregator.aggregateData(user.name, agency);
        }

        if(agency.youtube['feeds'].length) {
            YoutubeAggregator.aggregateData(user.name, agency);
        }

        if(agency.socrata['feeds'].length) {
            SocrataAggregator.aggregateData(user.name, agency);
        }

        if(agency.foursquare['feeds'].length) {
            FoursquareAggregator.aggregateData(user, agency);
        }

        if(agency.seeclickfix['feeds'].length) {
            SeeClickFixAggregator.aggregateData(user, agency);
        }

        if(agency.rss['feeds'].length) {
            RSSAggregator.aggregateData(user, agency);
        }

        if(agency.ical['feeds'].length) {
            ICalendarAggregator.aggregateData(user, agency);
        }

        if(agency.yelp['feeds'].length) {
            YelpAggregator.aggregateData(user, agency);
        }

        if(agency.gtfs['feeds'].length) {
            GtfsAggregator.aggregateData(user, agency);
        }

        if(agency.election['feeds'].length) {
           ElectionPollingAggregator.aggregateData(user, agency);
        }

    });
};

exports.extractData = function(user, callback){
    logger.log('info', 'Running data aggregators');
    callback = callback || function() {}; 
    // Aggregate for 1
    if(user) {
        extractDataForUser(user);
        callback();
    }
    // Do them all
    else {
        User.allUsers(function(err, users) {
            _.forEach(users, function(user) {
                console.log("extracting for: " + user.name);
                extractDataForUser(user);
                callback();
            });
        });
    }
}

exports.gatherSearchCriteria = function(userName, agencyName, queryList, platform, callback){
    var criteriaList = queryList["feeds"] || [];
    if(criteriaList.length && _.isArray(criteriaList)) {
        var searchCriteria = {
            tags: [],
            accounts: [],
            url: []
        };

        _.map(criteriaList, function(criteria) {
             var criteriaType = criteria.type;

            if(criteriaType === CRITERIA_TYPE.HASHTAG) {
                searchCriteria.tags.push({
                    "name": criteria.query,
                    "frequency": criteria.frequency !=undefined && criteria.frequency!="" ? criteria.frequency : queryList.frequency
                });
            } else if(criteriaType === CRITERIA_TYPE.ACCOUNT) {
                searchCriteria.accounts.push({
                    "name": criteria.query,
                    "frequency": criteria.frequency !=undefined && criteria.frequency!="" ? criteria.frequency : queryList.frequency
                });
            }
        });

        logger.log('info', 'Gathered search criteria for user: %s, agency: %s, service: %s', userName, agencyName, platform);
        return callback(searchCriteria);
    }
}

// Save a post
exports.savePost = function(post, callback) {
    let toSave = _.assignIn(new Post(), post);
    toSave.save().then(
        (newPost) => {
            // logger.log(
            //     'info', 
            //     'Saved _id: %s, name: %s, agency: %s, service: %s', 
            //     newPost._id, post.userName, post.agencyName, post.service
            // );
            callback();
        }
    )
    .catch(
       (reason) => {
            logger.log( 'error', reason.errmsg );
            callback();
        }
    );
}