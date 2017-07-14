var mongoose = require('mongoose'),
    random = require('mongoose-simple-random'),
    config = require(__base + 'config/config.js'),
    logger = require(__base + 'config/logger'),
    Post = require('./Post'),
    Watcher = require('./Watcher'),
    UserDetailsProvider = require('./UserDetailsProvider'),
    _ = require("lodash");

var ObjectId = mongoose.Schema.ObjectId;

var FeedSchema = new mongoose.Schema({
    type: {type: String, required: true},
    frequency: {type: String, required: false},
    query: {type: String, required: true}
});

var SeeClickFixFeedSchema = new mongoose.Schema({
    status: {type: String, required: true}
});

var GtfsFeedSchema = new mongoose.Schema({
    type: {type: String, required: true},
    url: {type: String, required: true}
});

var ElectionFeedSchema = new mongoose.Schema({
    electionId: {type: String, required: true},
    address: {type: String, required: true}
});

// Holds an "agency's" accounts
var AgencySchema = new mongoose.Schema({
    name: {type: String, required : true},
    facebook: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    instagram: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    twitter: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    youtube: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    seeclickfix: {
        frequency: {type: String, required: false},
        zoom: {type: String, required: false},
        per_page: {type: String, required: false},
        feeds: [SeeClickFixFeedSchema]
    },
    rss: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    ical: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    yelp: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    gtfs: {
        frequency: {type: String, required: false},
        feeds: [GtfsFeedSchema]
    },
    election: {
        frequency: {type: String, required: false},
        feeds: [ElectionFeedSchema]
    },
    socrata: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    },
    foursquare: {
        frequency: {type: String, required: false},
        feeds: [FeedSchema]
    }
});

var RepresentativeAddressSchema = new mongoose.Schema({
    line1: {type: String, required : false},
    city: {type: String, required : false},
    state: {type: String, required : false},
    zip: {type: String, required : false}
});

var RepresentativeChannelSchema = new mongoose.Schema({
    id: {type: String, required : false},
    type: {type: String, required : false}
});

var RepresentativeSchema = new mongoose.Schema({
    name: {type: String, required : false},
    officeName: {type: String, required : false},
    divisionId: {type: String, required : false},
    address: [RepresentativeAddressSchema],
    party: {type: String, required : false},
    phones:[{type: String, required : false}],
    urls: [{type: String, required : false}],
    channels: [RepresentativeChannelSchema]
});

var UserSchema = new mongoose.Schema({
    id: {type: String, unique : true, required : true, dropDups: true},
    parent: {type: String, unique : false},
    type: {type: String, required : false},
    name: {type: String, unique : true, required : true, dropDups: true},
    label: {type: String, required : false},
    teaser: {type: String, required : false},
    description: {type: String, required : false},
    image: {type: String, required : false},
    wikipediaUrl: {type: String, required : false},
    geojsonUrl: {type: String, required : false},
    lat: {type: Number, required : false},
    lng: {type: Number, required : false},
    date: Date,
    representatives: [RepresentativeSchema],
    geometry: {
        type: {type: String, required: false},
        coordinates: []
    },
    agencies: [AgencySchema]
}, {
    collection: 'sma_users'
});

UserSchema.index({ geometry: 'Polygon' });

UserSchema.statics.allUsers = function(callback) {
    this.find().exec(function (err, users) {
        if(err) {
            return callback(err);
        }
        return users ? callback(undefined, users) : callback(undefined, undefined);
    });
};

UserSchema.statics.findUser = function(name, callback){
    this.findOne({
        name: name
    }).exec(function (err, user) {
        if(err) {
            return callback(err);
        }
        return user ? callback(undefined, user) : callback(undefined, undefined);
    });
};


UserSchema.statics.findUserById = function(id, callback){
    this.findOne({
        _id: id
    }).exec(function (err, user) {
        if(err) {
            return callback(err);
        }
        return user ? callback(undefined, user) : callback(undefined, undefined);
    });
};

// Helper populates agency data
UserSchema.statics.agencyPopulate = function(agencyData) {
    var agency = new AgencySchema();
    agency.name = agencyData.name ? agencyData.name : 'default';
    agency.facebook = agencyData.facebook;
    agency.instagram = agencyData.facebook;
    agency.twitter = agencyData.facebook;
    agency.youtube = agencyData.facebook;
    agency.seeclickfix = agencyData.seeclickfix;
    agency.socrata = agencyData.socrata;
    agency.foursquare = agencyData.foursquare;
    return agency;
};

// Updates user agencies
// adds new if present
// updates otherwise
// deleteMode = true deletes mode
UserSchema.statics.updateAgencies = function(userName, agencies, callback, deleteMode) {
    var $that = this;
    // Check if user already exists
    this.findUser(userName, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback(findErr);
        }
        // User exists
        else if(!user) {
            callback('User doesn\'t exist');
        }
        else {
            // INCOMING agency
            _.forEach(agencies, function(agency, agencyKey){

                var existentAgency = false;

                // EXISTING agency
                _.forEach(user.agencies, function(userAgency, userAgencyKey) {
                    // agency exists
                    if(agency.name == userAgency.name) {

                         // Just deleting an agency and all its items
                        if(deleteMode && _.size(agency) === 1) {
                            user.agencies[userAgencyKey].remove();
                            // remove watchers
                            Watcher.clearInterval({
                                userName: userName, 
                                agencyName: agency.name
                            });
                            // Remove posts
                            Post.deleteByUserAndAgency(userName, agency.name);
                            // Set flag so its not re-added
                            existentAgency = true;
                        }
                        // Modifying / deleting portions of agency
                        else {

                            // Each service in INCOMING agency
                            _.forEach(agency, function(service, serviceName){

                                var toDelete = {};

                                // modify frequency ?
                                if(service['frequency'] && service['frequency'] > 0) {
                                    user.agencies[userAgencyKey][serviceName]['frequency'] = service['frequency'];
                                }

                                // Deleting?
                                if(deleteMode) {

                                    // Grab items to delete
                                    _.forEach(service.feeds, function(entry, entryKey){
                                        _.forEach(userAgency[serviceName].feeds, function(existEntry, existEntryKey){
                                            if(existEntry.type == entry.type && existEntry.query == entry.query){
                                                toDelete[existEntryKey] = entry;
                                            }
                                        })
                                    });
                                    // Delete posts
                                    _.forEach(toDelete, function(entry){
                                        logger.log('info',"deleting posts for agency: %s, service: %s, type: %s, query: %s", agency.name, serviceName, entry.type, entry.query);
                                        var criteria = {
                                            userName: userName, 
                                            service: serviceName,
                                            agencyName: agency.name,
                                            match: entry.type == 'account' ? '@' + entry.query : '#' + entry.query
                                        };
                                        // remove watchers
                                        Watcher.clearInterval(criteria);
                                        // delete posts
                                        Post.deleteByCrtiteria(criteria);
                                    });
                                }

                                // Each feed in INCOMING service
                                _.forEach(service.feeds, function(entry, entryKey){
                                    var toAdd = true;
                                    // Deleting?
                                    if(deleteMode) {
                                        _.forEach(toDelete, function(entryToDelete, existEntryKey){
                                            // Delete the entry
                                            if(entryToDelete.type == entry.type && entryToDelete.query == entry.query){
                                                toAdd = false;
                                                user.agencies[userAgencyKey][serviceName].feeds[existEntryKey].remove();
                                            }
                                        });
                                    }
                                    else {
                                        _.forEach(userAgency[serviceName].feeds, function(existentEntry){
                                            // Already exists, don't add
                                            if(existentEntry.type == entry.type && existentEntry.query == entry.query){
                                                toAdd = false;
                                            }
                                        })
                                    }

                                    // Add ?
                                    if(toAdd){
                                        user.agencies[userAgencyKey][serviceName].feeds.push(entry);
                                    }
                                });
                            });

                            existentAgency = true;
                            return false;
                        }
                    }
                });

                // Wasn't present so add to user
                if(!existentAgency) {
                    user.agencies.push(agency);
                }

            });
            
            
            user.save(function (saveErr) {
                if(saveErr) {
                    callback(saveErr);
                }
                else {
                    callback(undefined, user);
                }
            });
        }
    })
};

UserSchema.statics.createUser = function(data, NewUser, callback) {
    var $that = this;
    // Check if user already exists
    this.findUser(data.name, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback(findErr)
        }
        // User exists
        else if(user) {
            callback('User exists');
        }
        else {
            // Create new
            NewUser.name = data.name;
            NewUser.id = data.name;
            NewUser.date = new Date();

            NewUser.type = data.type;
            NewUser.label = data.label;
            NewUser.geojsonUrl = data.geojsonUrl;

            UserDetailsProvider.getUserDetails(NewUser, function(user){
                user.agencies = [];
                // Create a new agency for each entry
                if(data.agencies!=undefined){
                    _.forEach(data.agencies, function(agencyData) {
                        //var agency = $that.agencyPopulate(agencyData);
                        user.agencies.push(agencyData);
                    });
                }

                user.save(function (saveErr) {
                    if(saveErr) {
                        callback('Save error');
                    }
                    else {
                        callback(undefined, NewUser);
                    }
                });
            });
        }

    });
};

UserSchema.statics.delete = function(userName, agencies, callback) {
    var $that = this;
    // Check if user already exists
    this.findUser(userName, function(findErr, user) {
        // Mongo error
        if(findErr) {
            callback(userName)
        }
        // User exists
        else if(!user) {
            callback('User doesn\'t exist');
        }
        else {
            // Not deleting the whole user,
            // just some agencies           
            if(agencies && agencies.length) {
                // Run through agencies
                _.forEach(user.agencies, function(agency, key) {
                    // Delete posts and agency
                    if(_.includes(agencies, agency.name)) {
                        user.agencies[key].remove();
                        // remove watchers
                        Watcher.clearInterval({
                            userName: userName, 
                            agencyName: agency.name
                        });
                        // remove posts
                        Post.deleteByUserAndAgency(userName, agency.name);
                    }
                });
                user.save(function (saveErr) {
                    if(saveErr) {
                        callback('Error deleting');
                    }
                    else {
                        callback(undefined, user);
                    }
                });

            }
            // Remove the whole user
            else {
                user.remove(function (saveErr) {
                    if(saveErr) {
                        callback('Error deleting');
                    }
                    else {
                        // remove watchers
                        Watcher.clearInterval({
                            userName: userName
                        });
                        // remove posts
                        Post.deleteByUser(userName);
                        callback(undefined, user);
                    }
                });
            }
                    
        }
    });
};

module.exports = mongoose.model('User', UserSchema);