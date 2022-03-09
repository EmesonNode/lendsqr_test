//npm i winston
//npm i winston-daily-rotate-file

const winston = require('winston');
require('winston-daily-rotate-file');

const dashLog = new winston.transports.DailyRotateFile({
    filename: "./logs/Error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m"
});

const dash = winston.createLogger({
    transports: [
        dashLog,
        new winston.transports.Console({ colorize: true }),
    ]
});


module.exports = { dashLogger: dash };
