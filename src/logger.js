'use strict'

const winston = require('winston')
const moment = require('moment')

const logOptions = {
  level: process.env.LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      colorize: 'all',
      json: false,
      timestamp: () => moment().format('MM/DD/YYYY h:mm:ss:SSSA')
    }),
    new winston.transports.File({
      filename: './trader.log',
      maxsize: 1000000,
      maxFiles: 5,
      showLevel: true,
      tailable: true,
      timestamp: () => moment().format('MM/DD/YYYY h:mm:ss:SSSA')
    })
  ],
  colorize: true
}

module.exports = new winston.Logger(logOptions)
