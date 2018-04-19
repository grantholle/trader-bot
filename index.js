'use strict'

// Load env variables
require('dotenv').config()

const gdaxWebsocket = require('./src/gdaxWebsocketClient')
const init = require('./src/initialize')
const tickerHandler = require('./src/handleTickerMessage')
const logger = require('./src/logger')
const { products, granularities } = require('./src/config')
const heartbeatReconnectDelay = 15000

const debug = obj => {
  console.log(require('util').inspect(obj, {
    showHidden: true,
    depth: null,
    colors: true
  }))
}

// Stores all candles, EMA data, and current-period candle data
// This is the "data"
let priceTracker = {}
let heartbeatTimeout

gdaxWebsocket.on('open', () => {
  logger.info(`Connected to ${gdaxWebsocket.websocketURI}`)

  heartbeatTimeout = setTimeout(gdaxWebsocket.connect, heartbeatReconnectDelay)

  // Fetch the price history and calculate the
  // current EMA for each granularity and period
  init().then(tracker => {
    priceTracker = tracker

    // Only attach the listener after we've been initialized
    gdaxWebsocket.on('message', message => {
      // Listen for hearbeats, reconnect if we lose the heartbeat after 15 seconds
      if (message.type === 'heartbeat') {
        clearTimeout(heartbeatTimeout)
        heartbeatTimeout = setTimeout(gdaxWebsocket.connect, heartbeatReconnectDelay)
      }

      tickerHandler(message, priceTracker)
    })
  }).catch(logger.error)
})

gdaxWebsocket.on('close', () => {
  logger.info(`Websocket connection closed.`)

  // Stop all the intervals
  for (const product in products) {
    for (const granularity of granularities) {
      clearInterval(priceTracker[product][granularity].interval)
    }
  }
})

gdaxWebsocket.on('error', logger.error)
