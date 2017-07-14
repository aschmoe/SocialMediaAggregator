"use strict";

var config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    request = require('request'),
    Aggregator = require('../AggregatorController'),
    _ = require('lodash'),
    fs = require('fs'),
    icalendar = require('icalendar');

exports.aggregateData = function(user, agency) {
    var $that = this;

   Aggregator.runWithWatcher(user.name, agency.name, agency.name, 'ical', agency.ical.frequency, null, function(){
        $that.extractData(user, agency);
    });

}

exports.extractData = function(user, agency){
    var $that = this;

    agency.ical['feeds'].forEach(function(criteria){
        $that.extractICalPosts(criteria.query, agency.name, user.name, criteria.type);
    });

}

exports.extractICalPosts = function(url, agencyName, userName, match){
    var $that = this;

    request({
        url: url,
        method: 'GET'
    }, function(error, response, body) {
        if(error || !body || !response) {
            return callback(undefined);
        }
        else {
            var ical = icalendar.parse_calendar(body);
            var events = ical.events();

            events.forEach(function(event){
                $that.savePost(event.properties, userName, agencyName, match);
            });
        }
    });
}

exports.savePost = function(postInfo, userName, agencyName, match){

    if(postInfo!=undefined){
        var post = {};

        post.userName = userName;
        post.agencyName = agencyName;
        post.date_extracted = new Date();
        post.service = 'ical';
        post.account = '';
        post.match = match;
        post.likes = 0;
        post.icon = '';
        post.image = '';
        post.loc = {}

        post.url = postInfo.URL!=undefined && postInfo.URL.length!=0 ? postInfo.URL[0].value : '';
        post.text = postInfo.SUMMARY!=undefined && postInfo.SUMMARY.length!=0 ? postInfo.SUMMARY[0].value : '';
        post.id = postInfo.UID!=undefined && postInfo.UID.length!=0 ? postInfo.UID[0].value : '';
        post.date = postInfo.DTSTART!=undefined && postInfo.DTSTART.length!=0 ? postInfo.DTSTART[0].value : '';

        post.save();
    }
}
