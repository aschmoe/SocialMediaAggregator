var winston = require('winston'),
    config = require('./config');

winston.level = config.app.logging_level;

module.exports = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                var dt = new Date();
                var formatted = dt.getDate() + "/" + (dt.getMonth() + 1) + "/" + dt.getFullYear() + " ";
                formatted += dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + ":" + dt.getMilliseconds();

                return formatted;
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({ filename: 'app.log' })
    ]
});