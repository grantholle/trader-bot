'use strict'

const logger = require('./logger')
const { periods, granularities } = require('./config')
const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)
const BigNumber = require('bignumber.js')
const { last, clone } = require('lodash')
const { percentChange } = require('./utilities')

let lastTickerPrice
let numberOfTicksBelowEma = 0

module.exports = (message, priceTracker) => {
  // If this isn't a ticker message or is and doesn't have a trade id
  if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
    return
  }

  message.price = new BigNumber(message.price)

  logger.verbose(`${message.product_id}: Trade: ${message.side} @ ${message.price.toFixed(2)} (${message.last_size})`)

  // If it was the same price as last time, don't continue
  if (lastTickerPrice && message.price.isEqualTo(lastTickerPrice)) {
    return
  }

  const productData = priceTracker[message.product_id]

  let priceIsBelowEma = true
  let smallerPeriodIsLower = true

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
      const percent = percentChange(lastEma, candle.close)

      logger.debug(`${message.product_id}: Current price (${candle.close.toFixed(2)}) different from ${granularity / 60}min EMA${period} (${lastEma.toFixed(2)}) by ${percent.toFixed(2)}%`)

      // Buying logic:
      // Both granularities' and periods' percent change is negative
      if (percent.isPositive()) {
        priceIsBelowEma = false
      }

      // Both granularities' and periods' EMA12 is below the EMA26 (seemingly starting to trend down)
      if (period !== smallerPeriod) {
        const smallerLastEma = new BigNumber(last(productData[granularity].indicators.ema[smallerPeriod]))

        if (smallerLastEma.isGreaterThan(lastEma)) {
          smallerPeriodIsLower = false
        }
      }
    }
  }

  // Count the number of tick cycles where price is below and the smaller is lower
  if (priceIsBelowEma && smallerPeriodIsLower) {
    numberOfTicksBelowEma++
  }

  // It has done this for at least 2? ticker cycles
  if (numberOfTicksBelowEma > 1) {
    const [emaOne, emaTwo] = periods.map(p => new BigNumber(last(productData[smallerGranularity].indicators.ema[p])))

    // When both the lower granularity EMAs are within .01% of each other (meaning they are about to cross)
    // and have a zero or positive percent difference between the current trade price
    if (percentChange(emaOne, emaTwo).abs().isGreaterThanOrEqualTo(0.01) &&
    percentChange(emaOne, lastTickerPrice).isGreaterThanOrEqualTo(0)) {
      logger.info(`${message.product_id}: Place buy order for ${message.best_bid}`)
      numberOfTicksBelowEma = 0
      // Check account balances if we can buy
      // If we can, calculate the total coins we can buy based on the available USD
      // put in a buy order for the `best_bid` price
      // reset numberOfTicksBelowEma
    }
  }

  // Selling logic:
  //

  lastTickerPrice = clone(message.price)
}
