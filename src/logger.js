'use strict'

const winston = require('winston')
const moment = require('moment')
const p = require('path')

const logOptions = {
  level: process.env.LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      colorize: 'all',
      json: false,
      timestamp: () => moment().format('MM/DD/YYYY HH:mm:ss:SSS')
    }),
    new winston.transports.File({
      filename: p.join(__dirname, '..', 'logs', 'trader.log'),
      maxsize: 1000000,
      maxFiles: 5,
      showLevel: true,
      tailable: true,
      timestamp: () => moment().format('MM/DD/YYYY HH:mm:ss:SSS')
    })
  ],
  colorize: true
}

module.exports = new winston.Logger(logOptions)
