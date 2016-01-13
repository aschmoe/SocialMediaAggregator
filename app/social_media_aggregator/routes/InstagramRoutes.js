var express = require('express'),
    request = require('request'),
    api = require('instagram-node').instagram(),
    fs = require('fs'),
    router = express.Router();

router.get('/authenticate', function(req, res) {
    logger.log('debug', 'Authenticating to Instagram');
    api.use({client_id: config.apps.instagram.key,
             client_secret: process.env.INSTAGRAM_SECRET});

    res.redirect(api.get_authorization_url(config.apps.instagram.redirectUri));
});

router.get('/authcallback', function(req, res) {
    api.authorize_user(req.query.code, config.apps.instagram.redirectUri, function(err, result) {
        logger.log('debug', 'Authentication to Instagram was successful!');

        if (err) {
            console.log(err.body);
        } else {
            config.apps.instagram.access_token = result.access_token;

            fs.writeFile(__dirname + "/../../config/instagram-config.js", "module.exports = " + JSON.stringify({access_token: result.access_token}, null, 4), function(err) {
                if(err) {
                    return logger.log('info', err);
                }
            });
        }

        res.send("authenticated");
    });
});

module.exports = router;