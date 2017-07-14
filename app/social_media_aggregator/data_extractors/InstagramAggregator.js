"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    Post = require(__base + 'model/Post'),
    Aggregator = require('../AggregatorController'),
    Scraper = require('./InstagramScraper'),
    _ = require('lodash'),
    fs = require('fs');

var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;
   Aggregator.gatherSearchCriteria(userName, agency.name, agency.instagram, 'instagram', function(criteria){
        searchCriteria = criteria;
        $that.extractData(userName, agency.name, criteria);
    });
}

exports.extractData = function(userName, agencyName, criteria){
    var $that = this;

    criteria.accounts.forEach(function(profile){
        Aggregator.runWithWatcher(userName, agencyName, '@' + profile.name, 'instagram', profile.frequency, null, function(){
            logger.log('info', 'Extracting data from Instagram profile %s', profile.name);
            $that.getLastPostId('@' + profile.name, function(lastPostId){
                Scraper(profile.name, lastPostId, function(issue, posts) {
                    // Error
                    if(issue) {
                        if( _.isObject(issue) ) {
                            logger.log( 
                                'error', 
                                'Instragram scraping issue: %s, agencyName: %s, profile: %s',
                                userName, agencyName, profile.name, issue
                            );
                        }
                        else {
                            logger.log( 
                                'error', 
                                'Instragram scraping issue: %s, agencyName: %s, profile: %s, reason: %s',
                                userName, agencyName, profile.name, issue
                            );
                        }
                    }
                    else {
                        $that.savePosts(userName, agencyName, '@' + profile.name, posts, lastPostId);
                    }
                });
            });
        });
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('instagram', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.savePosts = function(userName, agencyName, match, posts, lastPostId){
    var postsTasks = [];
    _.forEach(posts, function(postInfo){
        if(lastPostId && postInfo.id === lastPostId) {
            return false;
        }
        postsTasks.push(function(callback){
            var post = {};

            post.userName = userName;
            post.agencyName = agencyName;
            post.id = postInfo.id;
            post.date = new Date(postInfo.created_time * 1000);
            post.date_extracted = new Date();
            post.service = 'instagram';
            post.account = postInfo.user.username;
            post.match = match;
            post.image = _.get(postInfo, 'images.standard_resolution.url') || _.get(postInfo, 'images.thumbnail.url');
            post.text = postInfo.caption!=null && postInfo.caption.text!=null ? postInfo.caption.text : "";
            post.likes = postInfo.likes!=undefined && postInfo.likes.count!=undefined ? postInfo.likes.count : 0;
            post.url = postInfo.link;
            post.icon = postInfo.user.profile_picture;

            if(postInfo.location!=null && postInfo.location.latitude!=null && postInfo.location.longitude!=null) {
                post.loc = {
                    type: 'Point',
                    coordinates: [postInfo.location.longitude, postInfo.location.latitude],
                    address: postInfo.location.street_address
                }
            }

            Aggregator.savePost(post, callback);
        });
    });

    async.parallel(postsTasks, function(){
    });
}