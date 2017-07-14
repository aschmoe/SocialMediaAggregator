"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    api = require('instagram-node').instagram(),
    Post = require(__base + 'model/Post'),
    Aggregator = require('../AggregatorController'),
    _ = require('lodash'),
    fs = require('fs');

var searchCriteria = {};

exports.aggregateData = function(userName, agency) {
    var $that = this;

   Aggregator.gatherSearchCriteria(userName, agency.name, agency.instagram, 'instagram', function(criteria){
        searchCriteria = criteria;

        $that.ensureAuthenticated(function(isAuthenticated){
            if(isAuthenticated){
                $that.extractData(userName, agency.name, criteria);
            }
        });
    });
}

exports.ensureAuthenticated = function(callback){
    if(config.apps.instagram.access_token) {
        return callback(true);
    }
    else {
        config.apps.instagram.access_token = _.get(process, 'env.INSTAGRAM_ACCESS_TOKEN');
        if(config.apps.instagram.access_token) {
            return callback(true);
        }
        else {
            var path = __base + 'config/instagram-config.js';
            if(fs.existsSync(path)) {
                let instagram_auth = require(path);
                if(instagram_auth && instagram_auth.access_token) {
                    config.apps.instagram.access_token = instagram_auth.access_token;
                    console.log(config.apps.instagram.access_token);
                    return callback(true);
                }
            }
            // erring
            logger.log( 'error', 'Instagram access does not exist' );
            return callback(false);
        }
    }
}

exports.extractData = function(userName, agencyName, criteria){
    var $that = this;

    criteria.accounts.forEach(function(profile){
        Aggregator.runWithWatcher(userName, agencyName, '@' + profile.name, 'instagram', profile.frequency, null, function(){
            logger.log('info', 'Extracting data from Instagram profile %s', profile.name);
            $that.getProfileId(profile.name, function(profileid){
                if(profileid!=undefined){
                    $that.getLastPostId('@' + profile.name, function(lastPostId){
                        $that.extractProfilePosts(profileid, lastPostId, function(posts){
                            $that.savePosts(userName, agencyName, '@' + profile.name, posts);
                        });
                    });
                }
                else {
                    logger.log( 
                        'error', 
                        'Instagram access issue for username: %s, agencyName: %s, profile: %s',
                        userName, agencyName, profile.name
                    );
                }
            });
        });
    });

    criteria.tags.forEach(function(tag){
        Aggregator.runWithWatcher(userName, agencyName, '#' + tag.name, 'instagram', tag.frequency, null, function(){
            logger.log('info', 'Extracting data from Instagram tag %s', tag.name);
            $that.getLastPostId('#' + tag.name, function(lastPostId){
                $that.extractTagPosts(tag.name, lastPostId, function(posts){
                    if(posts!=undefined){
                        $that.savePosts(userName, agencyName, '#' + tag.name, posts);
                    }
                    else {
                        logger.log( 
                            'error', 
                            'Instagram access issue for username: %s, agencyName: %s, tag: %s', 
                            userName, agencyName, tag.name
                        );
                    }
                });
            });
        });
    });
}

exports.getProfileId = function(profile, callback){
    request({
        url: 'https://api.instagram.com/v1/users/search?q=' + profile + '&access_token=' + config.apps.instagram.access_token,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            console.log(body);
            body = JSON.parse(body);
            return body.data!=undefined && body.data.length!=0 ? callback(body.data[0].id) : callback(undefined);
        }
    });
}

exports.getLastPostId = function(match, callback){
    Post.getLastPostId('instagram', match, function(lastPostId){
        return callback(lastPostId);
    });
}

exports.extractProfilePosts = function(profileid, lastPostId, callback){
    var url = 'https://api.instagram.com/v1/users/' + profileid + '/media/recent/?access_token=' + config.apps.instagram.access_token
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return callback(body.data);
        }
    });
}

exports.extractTagPosts = function(tag, lastPostId, callback){
    logger.log('info', 'Extracting data from Instagram tag %s', tag);
    var url = 'https://api.instagram.com/v1/tags/' + tag + '/media/recent/?access_token=' + config.apps.instagram.access_token
    url += lastPostId!=undefined ? "&min_id=" + lastPostId : "";
    url += "&count=" + config.app.postsLimit;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            console.log('error');
            console.log(error);
            return callback(undefined);
        }
        else {
            body = JSON.parse(body);

            return body.data!=undefined && body.data.length!=0 ? callback(body.data) : callback(undefined);
        }
    });
}

exports.savePosts = function(userName, agencyName, match, posts){
    var postsTasks = [];

    posts.forEach(function(postInfo){
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
            post.image = _.get(postInfo, 'images.low_resolution.url') || _.get(postInfo, 'images.thumbnail.url');
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