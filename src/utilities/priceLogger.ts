import winston from 'winston'
import moment from 'moment'
import p from 'path'

const logOptions = {
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: p.join(__dirname, '..', 'logs', 'prices.log'),
      maxsize: 1000000,
      maxFiles: 5,
      tailable: true,
      json: false,
      timestamp: () => moment().format('MM/DD HH:mm:ss')
    })
  ]
}

export default new winston.Logger(logOptions)
