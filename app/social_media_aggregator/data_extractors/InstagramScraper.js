var request = require('request');
var path    = require('path');
var qs      = require('querystring');
var url     = require('url');
var config = require(__base + 'config/config');
var logger = require(__base + 'config/logger');

module.exports = function(username, minId, callback) {
  return new Scraper(username).crawl(minId, callback);
};

function Scraper(username) {
  this.username = username;
  this.baseUrl = url.format({
    protocol : 'http',
    host     : 'instagram.com',
    pathname : path.join(username, 'media')
  });
}

Scraper.prototype.crawl = function(minId, callback) {
  var url  = this.baseUrl;
  if(minId) {
    url += '?' + qs.stringify({min_id: minId});
  }
  console.log(url);
  request({
      url: url,
      method: 'GET'
  }, function(error, response, body) {
      if(error) {
        return callback(error);
      } else if(!body) {
        return callback('No body');
      } else if(!response) {
        return callback('No response');
      } else {
        try {
           body = JSON.parse(body);
        }
        catch (e) {
          // statements to handle any exceptions
          logger.log('error', 'Instragram scraping malformed json: %s', url, e );
        }
        return body.items!=undefined && body.items.length!=0 ? callback(null, body.items) : callback('No items');
      }
  });
}