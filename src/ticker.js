'use strict'

const logger = require('./logger')
const priceLogger = require('./priceLogger')
const { granularities } = require('./config')
const BigNumber = require('bignumber.js')
const { clone } = require('lodash')
const traderLogic = require('./logic')

let lastTickerPrice

module.exports = (message, priceTracker) => {
  // If this isn't a ticker message or is and doesn't have a trade id
  if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
    return
  }

  message.price = new BigNumber(message.price)

  logger.verbose(`${message.product_id}: Trade: ${message.side} @ $${message.price.toFixed(2)}`)

  // If it was the same price as last time, don't continue
  if (lastTickerPrice && message.price.isEqualTo(lastTickerPrice)) {
    return
  }

  if (lastTickerPrice) {
    priceLogger.info(`${message.product_id}: ${message.price.isGreaterThan(lastTickerPrice) ? '▲' : '▼'} ${message.price.toFixed(2)}`)
  }

  const productData = priceTracker[message.product_id]

  // Set the current candle price data for each granularity
  for (const granularity of granularities) {
    const candle = productData[granularity].currentCandle

    candle.close = message.price

    // Set the high and low for the candle
    if (message.price.isLessThan(candle.low)) {
      candle.low = message.price
    }

    if (message.price.isGreaterThan(candle.high)) {
      candle.high = message.price
    }
  }

  lastTickerPrice = clone(message.price)

  // The module that handles the logic to make trades
  traderLogic(message, productData)
}
