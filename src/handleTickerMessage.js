'use strict'

const logger = require('./logger')
const { periods, granularities } = require('./config')
const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)
const BigNumber = require('bignumber.js')
const { last, clone } = require('lodash')
const { percentChange } = require('./utilities')

let lastTickerPrice

module.exports = (message, priceTracker) => {
  // If this isn't a ticker message or is and doesn't have a trade id
  if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
    return
  }

  let isAboveEma
  let isBelowEma
  let trendingDown
  let trendingUp

  message.price = new BigNumber(message.price)

  logger.verbose(`${message.product_id}: Trade: ${message.side} @ ${message.price.toFixed(2)} (${message.last_size})`)

  // If it was the same price as last time, don't continue
  if (lastTickerPrice && message.price.isEqualTo(lastTickerPrice)) {
    return
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

    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const lastEma = new BigNumber(last(productData[granularity].indicators.ema[period]))
      const percent = percentChange(lastEma, candle.close).toFixed(2)

      logger.debug(`${message.product_id}: Current price (${candle.close.toFixed(2)}) different from ${granularity / 60}min EMA${period} (${lastEma.toFixed(2)}) by ${percent}%`)
    }
  }

  lastTickerPrice = clone(message.price)
}
