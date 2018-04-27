'use strict'

const winston = require('winston')
const moment = require('moment')
const p = require('path')

const logOptions = {
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: p.join(__dirname, '..', 'logs', 'prices.log'),
      maxsize: 1000000,
      maxFiles: 5,
      tailable: true,
      json: false,
      timestamp: () => moment().format('HH:mm:ss')
    })
  ]
}

module.exports = new winston.Logger(logOptions)
