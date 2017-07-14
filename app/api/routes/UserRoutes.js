var express = require('express'),
    request = require('request'),
    logger = require(__base + 'config/logger'),
    User = require(__base + 'model/User'),
    config = require(__base + 'config/config.js'),
    async = require('async'),
    fs = require('fs'),
    _ = require('lodash'), 
    router = express.Router(),
    AggregatorController = require(__base + 'social_media_aggregator/AggregatorController');

router.route('/create')
    .all(function(req, res, next) {
        routeAuth(req, res, next);
    })
    .post(function(req, res) {
        var payload = req.body;
        if(_.has(payload, 'name')) {
            var NewUser = new User();
            User.createUser(payload, NewUser, function(createError, user) {
                if(createError) {
                    logger.log('error', 'Create user error', createError);
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success', user: user});
                }
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }

    });

router.route('/update')
    .all(function(req, res, next) {
        routeAuth(req, res, next);
    })
    .post(function(req, res) {
        var payload = req.body;
        if(_.has(payload, 'name')) {
            var deleteMode = payload.deleteMode ? true : false
            User.updateAgencies(payload.name, payload.agencies, function(createError, user) {
                if(createError) {
                    logger.log( 
                        'error', 
                        'User update issue: %s, agencies: %s',
                        payload.name, payload.agencies.join(','), createError
                    );
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success'});
                }
            }, deleteMode);
        }
        else {
            res.status(500).json({ error: 'No name given' });
        }

    });

router.route('/delete')
    .all(function(req, res, next) {
        routeAuth(req, res, next);
    })
    .post(function(req, res) {
        var payload = req.body;
        if(_.has(payload, 'name')) {
            User.delete(payload.name, payload.agencies, function(createError, user) {
                if(createError) {
                    res.status(500).json({ error: 'message' });
                }
                else {
                    res.json({response: 'success'});
                }
            });
        }
        else {
            res.status(500).json({ error: 'message' });
        }
    });

router.route('/:user/aggregate')
    .all(function(req, res, next) {
        routeAuth(req, res, next);
    })
    .get(function(req, res) {
        // Check if user already exists
        User.findUser(_.get(req, 'params.user'), function(findErr, user) {
            if(findErr) {
                res.status(500).json(findErr);
            }
            else {
                AggregatorController.extractData(user, function() {
                    res.json("Ran aggregator for: " + user.name);
                });
            }
        });
    });


module.exports = router;