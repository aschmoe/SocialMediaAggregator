"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    async = require('async'),
    Aggregator = require('../AggregatorController');

exports.aggregateData = function(user, agency) {
    var $that = this;

   Aggregator.runWithWatcher(user.name, agency.name, agency.name, 'election', agency.election.frequency, null, function(){
        $that.extractData(user, agency);
    });
}

exports.extractData = function(user, agency){
    var tasks = [];
    var $that = this;

    agency.election['feeds'].forEach(function(election){
        tasks.push(function(callback){
            $that.extractElectionData(agency.election, user, election, function(posts){
                $that.savePosts(user.name, agency.name, election.electionId, posts, callback);
            });
        });
    });

    async.parallel(tasks, function(){
    });
}

exports.extractElectionData = function(agency, user, election, callback){
    var url = "https://www.googleapis.com/civicinfo/v2/voterinfo?";

    url += "address=" + (election.address!=undefined ? election.address.replace(" ","+") : "");
    url += "&electionId=" + election.electionId;
    url += "&key=" + process.env.GOOGLE_SECRET;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        } else {
            if(body.error!=undefined) {
                return callback(undefined);
            } else {
                body = JSON.parse(body);
                var elections = body.pollingLocations;

                return callback(elections);
            }
        }
    });
}

exports.savePosts = function(userName, agencyName, electionId, posts, callback){
    if(posts!=undefined && posts.length!=0){
        var postsTasks = [];

        posts.forEach(function(postInfo){
            postsTasks.push(function(callback){
                var post = {};

                post.userName = userName;
                post.agencyName = agencyName;
                post.id = postInfo.id;
                post.date = postInfo.startDate;
                post.date_extracted = new Date();
                post.service = 'election';
                post.account = '';
                post.match = electionId;
                post.image = '';
                post.text = postInfo.notes;
                post.likes = 0;

                post.loc = {
                    type : "Point",
                    coordinates : [],
                    address: postInfo.address.locationName + ", " + postInfo.address.line1 + " " + postInfo.address.line2 + " " + postInfo.address.line3 + ", " + postInfo.address.city + ", " + postInfo.address.state + ", " + postInfo.address.zip
                }

                post.url = '';
                post.icon = '';
                 Aggregator.savePost(post, callback);
            });
        });

        async.parallel(postsTasks, function(){
            callback();
        });

    } else {

        callback();

    }
}