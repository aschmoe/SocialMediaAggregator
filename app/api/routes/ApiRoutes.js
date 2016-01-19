var express = require('express'),
    request = require('request'),
    User    = require('../../model/User'),
    Post    = require('../../model/Post'),
    config  = require('../../config/config.js'),
    async   = require('async'),
    fs      = require('fs'),
    _       = require('lodash'), 
    router = express.Router();


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

// Returns array
var getPostsFromUserAsync = function(userName, agencyName, limit, services, postsList) {
    services = services || ['facebook', 'twitter', 'instagram', 'youtube'];
    var asyncTasks = [];
    _.forEach(services, function(service) {
        var criteria = {
            service: service,
            userName: userName
        }
        if(agencyName) {
            criteria['agencyName'] = agencyName;
        }
        asyncTasks.push(function(callback){ 
            Post.getLatest(criteria, Math.ceil(limit/services.length), function(posts){
                postsList.push.apply(postsList, posts);
                callback();
            })
        });
    });
    return asyncTasks;
};

router.route('/:user/feed/:agency?')
    .get(function(req, res) {
        var limit       = _.get(req, 'query.limit') || 10,
            userName    = _.get(req, 'params.user'),
            agencyName  = _.get(req, 'params.agency'),
            services    = _.get(req, 'query.services'),
            service    = _.get(req, 'params.service'),
            type  = _.get(req, 'params.type'),
            query  = _.get(req, 'params.query');

        if(userName!=undefined) {
            if(agencyName!=undefined ) {
                var postsList  = [],
                    asyncTasks = getPostsFromUserAsync(
                        userName, agencyName, limit, services, postsList
                    );
                async.parallel(asyncTasks, function(){
                    res.json(postsList);
                });
            } else if (services!=undefined){
                if(!_.isArray(services)) {  
                    services = services.split(",");
                }

                Post.getByUserAndServices(userName, services, function(findErr, posts) {
                    if(findErr) {
                        res.status(500).json(findErr);
                    }
                    else {
                        res.json(posts);
                    }
                });
            } else {
                Post.getByUser(userName, function(findErr, posts) {
                    if(findErr) {
                        res.status(500).json(findErr);
                    }
                    else {
                        res.json(posts);
                    }
                });
            }
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });

router.route('/:user/feed/:service/:type/:query')
    .get(function(req, res) {
        var userName    = _.get(req, 'params.user'),
            service  = _.get(req, 'params.service'),
            type  = _.get(req, 'params.type'),
            query  = _.get(req, 'params.query');

        if(userName!=undefined && service!=undefined && type!=undefined && query!=undefined){
            Post.getByUserServiceTypeAndQuery(userName, service, type, query, function(findErr, posts) {
                if(findErr) {
                    res.status(500).json(findErr);
                }
                else {
                    res.json(posts);
                }
            });
        }
    });

    
// router.route('/:user/accounts/delete')
//     .post(function(req, res) {
//         var payload = req.body;

//         config.accounts.twitter = removeCriteria(config.accounts.twitter, payload.accounts.twitter, 'twitter');
//         config.accounts.facebook = removeCriteria(config.accounts.facebook, payload.accounts.facebook, 'facebook');
//         config.accounts.youtube = removeCriteria(config.accounts.youtube, payload.accounts.youtube, 'youtube');
//         config.accounts.instagram = removeCriteria(config.accounts.instagram, payload.accounts.instagram, 'instagram');

//         fs.writeFile(__dirname + "/../../config/config.js", "module.exports = " + JSON.stringify(config, null, 4), function(err) {
//             if(err) {
//                 return console.log(err);
//             }

//             logger.log("debug", "Config file updated!");
//         });

//         res.json({response: 'success'});
//     });

// var addCriteria = function(destination, newCriteria){
//     if(newCriteria!=undefined && newCriteria.length!=0){
//         for(var i in newCriteria){
//             var criteria = newCriteria[i];

//             if(destination.indexOf(criteria)==-1){
//                 destination.push(criteria);
//             }
//         }
//     }

//     return destination;
// }

// exports.removeCriteria = function(destination, criteria, platform){
//     if(criteria!=undefined && criteria.length!=0){
//         for(var i in criteria){
//             var toDelete = criteria[i];

//             var indexToDel = destination.indexOf(toDelete);
//             if(indexToDel!=-1){
//                 Post.deleteByPlatformAndAccount(platform, toDelete);
//                 destination.splice(indexToDel, 1);
//             }
//         }
//     }

//     return destination;
// }



module.exports = router;