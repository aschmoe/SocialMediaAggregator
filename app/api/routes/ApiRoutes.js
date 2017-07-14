var express = require('express'),
    request = require('request'),
    User    = require(__base + 'model/User'),
    Post    = require(__base + 'model/Post'),
    config  = require(__base + 'config/config.js'),
    async   = require('async'),
    fs      = require('fs'),
    _       = require('lodash'),
    moment  = require('moment-timezone'),
    router  = express.Router();


router.route('/info')
    .get(function(req, res) {
        // Check if user already exists
        User.allUsers(function(findErr, users) {
            if(findErr) {
                res.status(500).json(findErr);
            }
            else {
                res.json(users);
            }
        });
    });

router.route('/:user/info')
    .get(function(req, res) {
        // Check if user already exists
        User.findUser(_.get(req, 'params.user'), function(findErr, user) {
            if(findErr) {
                res.status(500).json(findErr);
            }
            else {
                res.json(user);
            }
        });
    });

// Limits results to results per service
var limitReturn = function(postsList, limit, callback) {
    // First trim empty
    postsList = _.transform(postsList, function(result, posts) {
        if(posts && _.isArray(posts) && posts.length) {
            result.push(posts);
        }
    }, []);
    // empty?
    if(!postsList.length) {
        return callback(null, []);
    }
    // Then limit per post count
    var partLimit = Math.ceil(limit/postsList.length);
    postsList = _.transform(postsList, function(result, posts) {
        result.push(_.take(posts, partLimit));
    }, []);
    // Then flatten array, take limit
    callback( null, _.take( _.flatten(postsList), limit) );
}

// build before / after search criteria
var buildDateQuery = function(criteria, req) {
    var field       = _.get(req, 'query.dateField') || 'date',
        before      = _.get(req, 'query.before'),
        after       = _.get(req, 'query.after');

    if(!before && !after || !field) {
        return;
    }
    else {
        criteria[field] = {};
        if(before) {
            criteria[field]['$lt'] = moment(before).toISOString();
        }
        if(after) {
            criteria[field]['$gte'] = moment(after).toISOString();
        }
    }
    return;
}

// build sort criteria
var buildSortQuery = function(sort, req) {
    var orderBy       = _.get(req, 'query.orderBy') || 'date',
        order         = _.get(req, 'query.order') || 'desc';

    sort[orderBy] = order;
    return;
}

// Returns array
var getPostsFromUserAsync = function(criteria, limit, services, sort, postsList) {
    services = services || ['facebook', 'twitter', 'instagram', 'youtube'];
    var asyncTasks = [];
    _.forEach(services, function(service) {
        var newCrit = _.clone(criteria);
        newCrit['service'] = service;
        asyncTasks.push(function(callback){ 
            Post.getPostsByCriteria(newCrit, limit, sort, function(posts){
                postsList.push(posts);
                callback();
            })
        });
    });
    return asyncTasks;
};

router.route('/:user/feed')
    .get(function(req, res) {
        var limit       = parseInt(_.get(req, 'query.limit'), 10) || 10,
            userName    = _.get(req, 'params.user'),
            agencyName  = _.get(req, 'query.agency'),
            services    = _.get(req, 'query.services'),
            sort        = {},
            criteria    = {};

        if(userName!=undefined) {
            // Set up criteria
            criteria['userName'] = userName;
            if(agencyName) {
                criteria['agencyName'] = agencyName;
            }
            // Alter services if necessary
            if (services!=undefined && !_.isArray(services)){
                services = services.split(",");
            }
            // Add date query if present
            buildDateQuery(criteria, req);
            // Add sort query
            buildSortQuery(sort, req);
            // Prep async
            var postsList  = [],
                asyncTasks = getPostsFromUserAsync(
                    criteria, limit, services, sort, postsList
                );
            // Run async
            async.parallel(asyncTasks, function(){
                // Process results
                limitReturn(postsList, limit, function(limitError, posts) {
                    if(limitError) {
                        res.status(500).json(limitError);
                    }
                    else {
                        res.json(posts);
                    }
                }) 
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });

// Returns array
var getPostsFromAccountsAsync = function(criteria, limit, accounts, services, sort, postsList) {
    var asyncTasks = [];
    _.forEach(accounts, function(account) {
        var colon   = account.indexOf(':'), 
            service = account.substring(0, colon), 
            name    = account.substring(colon + 1);
        
        if(!services || _.isArray(services) && _.indexOf(services, service) >= 0) {
            var newCrit = _.clone(criteria);
            newCrit['service'] = service;
            newCrit['account'] = name;
            asyncTasks.push(function(callback){ 
                Post.getPostsByCriteria(newCrit, limit, sort, function(posts){
                    postsList.push(posts);
                    callback();
                })
            });
        }
    });
    return asyncTasks;
};

router.route('/:user/feed/accounts/:accounts')
    .get(function(req, res) {
        var limit     = parseInt(_.get(req, 'query.limit'), 10) || 10,
            userName  = _.get(req, 'params.user'),
            accounts  = _.get(req, 'params.accounts'),
            services    = _.get(req, 'query.services'),
            sort      = {},
            criteria  = {};
        if(userName!=undefined && accounts!=undefined) {
            // Set up criteria
            criteria['userName'] = userName;
            // Alter services if necessary
            if (services!=undefined && !_.isArray(services)){
                services = services.split(",");
            }
            // Add date query if present
            buildDateQuery(criteria, req);
            // Add sort query
            buildSortQuery(sort, req);
            // Process accounts
            if(!_.isArray(accounts)) {
                accounts = accounts.split(",");
            }
            // Prep async
            var postsList  = [],
                asyncTasks = getPostsFromAccountsAsync(
                    criteria, limit, accounts, services, sort, postsList
                );
            // Run async
            async.parallel(asyncTasks, function(){
                // Process results
                limitReturn(postsList, limit, function(limitError, posts) {
                    if(limitError) {
                        res.status(500).json(limitError);
                    }
                    else {
                        res.json(posts);
                    }
                }) 
            });        }
        else {
            res.status(500).json({ error: 'Sorry, that query returned no results' });
        }
    });
    

module.exports = router;