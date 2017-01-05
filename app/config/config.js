var _ = require('lodash');

var port =  process.env.PORT ? process.env.PORT : 80;

var mongo_db =  process.env.DB_CONNECTION ? process.env.DB_CONNECTION : '';
if(!mongo_db) {
  mongo_db = process.env.MONGO_PORT_27017_TCP_ADDR
        ? "mongodb://" + process.env.MONGO_PORT_27017_TCP_ADDR + ":" + process.env.MONGO_PORT_27017_TCP_PORT + "/socialmediaaggregator"
        : "mongodb://localhost:27017/socialmediaaggregator";
}

module.exports = {
    "port": port,
    "db": mongo_db,
    "app": {
        "frequency": 3600,
        "postsLimit": 10,
        "feedLimit": 5,
        "logging_level": "info"
    },
    "apps": {
        "twitter": {
            "key": "zm1Xhonwx2cy7Uv4TAp7WwsAB"
        },
        "facebook": {
            "key": "1020627834636909",
        },
        "instagram": {
            "key": "337e3ed6233e42fb9e8ac37e2bd44c5c",
            "redirectUri": "/instagram/authcallback"
        },
        "foursquare" : {
            "key": "1CAZ5UW5UDQ2F1EDEHFOULURU4K3RBWWITBOONJ2XLXPD52V"
        },
        "yelp" : {
            "consumer_key": "DQ1s8oBXcE3sjYLBB6BX9w",
            "token": "rVH7LgayRFrGQf-p43lT71d9wzswQrXJ"
        }
    }
}