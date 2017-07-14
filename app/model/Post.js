var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require(__base + 'config/config'),
    logger = require(__base + 'config/logger'),
    moment = require('moment-timezone');

var ObjectId = mongoose.Schema.ObjectId;

var PostSchema = new mongoose.Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    date: Date,
    date_extracted: Date,
    service: String,
    account: String,
    userName: String,
    agencyName: String,
    match: String,
    icon: String,
    image: String,
    url: String,
    website: String,
    googleLocalHours: String,
    text: String,
    likes: Number,
    agg_user: String,
    loc : Object,
    address: String
}, {
    collection: 'sma_posts'
});

PostSchema.plugin(random);
var RandomPostsProvider = mongoose.model('RandomPostsProvider', PostSchema);

PostSchema.statics.getLastPostTime = function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        date: -1
    }).exec(function (err, posts) {
        if(posts.length!=0 ) {
            var time = moment.tz(posts[0].date, 'America/Los_Angeles').valueOf();
            return callback(Math.floor(time/1000));
        }
        else {
            return callback(undefined)
        }
    });
};

PostSchema.statics.getLastPostId = function(service, match, callback){
    this.find({
        service: service,
        match: match
    }).sort({
        id: -1
    }).exec(function (err, posts) {
        return (posts && posts.length!=0) && posts.length!=0 ? callback(posts[0].id) : callback(undefined);
    });
};

PostSchema.statics.getPostsByCriteria = function(criteria, limit, sort, callback){
    limit =  limit!=undefined ? limit : config.app.feedLimit;
    this.find(criteria).sort(sort).limit(limit).exec(function (err, posts) {
        return (posts && posts.length!=0) ? callback(posts) : callback(undefined);
    });
};

PostSchema.statics.getByUser = function(userName, limit, callback){
    this.find({
        userName: userName
    }).limit(limit).exec(function (err, posts) {
        return callback(err, posts);
    });
};

PostSchema.statics.getByUserAndServices = function(userName, limit, services, callback){
    this.find({
        userName: userName,
        service: { $in : services}
    }).limit(limit).exec(function (err, posts) {
        return callback(err, posts);
    });
};

PostSchema.statics.getRandom = function(criteria, limit, callback){
    RandomPostsProvider.findRandom(criteria, {}, {limit: limit!=undefined ? limit : config.app.feedLimit}, function(err, results) {
        if (!err) {
            callback(results);
        }
    });
};

PostSchema.statics.deleteByUser = function(userName){
    this.find({
        userName: userName
    }).remove().exec();
};

PostSchema.statics.deleteByUserAndAgency = function(userName, agencyName){
    this.find({
        userName: userName,
        agencyName: agencyName
    }).remove().exec();
};

PostSchema.statics.deleteByUserAgencyAndService = function(userName, agencyName, platform){
    this.find({
        userName: userName,
        agencyName: agencyName,
        service: platform
    }).remove().exec();
};

PostSchema.statics.deleteByCrtiteria = function(criteria){
    this.find(criteria).remove().exec();
};

module.exports = mongoose.model('Post', PostSchema);