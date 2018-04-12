'use strict'

const logger = require('./logger')
const { periods, granularities } = require('./config')
const BigNumber = require('bignumber.js')
const { last, clone } = require('lodash')
const { percentChange, switchSide } = require('./utilities')
const getAccounts = require('./accounts')
const submitTrade = require('./trade')

const largerPeriod = Math.max(...periods)
const largerGranularity = Math.max(...granularities)
const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)

let lastTickerPrice
let numberOfTicksBelowEma = 0
let numberOfTicksAboveEma = 0

const MINIMUM_LOW_PRICE_TREND_UNTIL_TRADE = 2

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

  // Holds the 2 emas of the smaller granularity
  const [emaOne, emaTwo] = periods.map(p => new BigNumber(last(productData[smallerGranularity].indicators.ema[p])))
  const smallerGranularityEmaPeriodsChange = percentChange(emaTwo, emaOne)
  const currentPriceChangeFromSmallerEma = percentChange(emaOne, message.price)

  // Buying Logic:
  // Count the number of tick cycles where price is below and the smaller is lower
  // else if the price has jumped relatively a lot, lower the count until it's back to zero
  if (priceIsBelowEma && smallerPeriodIsLower) {
    numberOfTicksBelowEma++
  } else if (numberOfTicksBelowEma > 0 && currentPriceChangeFromSmallerEma.isGreaterThan(0.02)) {
    numberOfTicksBelowEma--
  }

  // It has done this for at least 2? ticker cycles
  if (numberOfTicksBelowEma >= MINIMUM_LOW_PRICE_TREND_UNTIL_TRADE) {
    logger.debug(`${message.product_id}: Number of ticks where the trade price has been below all EMAs: ${numberOfTicksBelowEma}`)
    logger.debug(`${message.product_id}: Smaller granularity EMA percent difference: ${smallerGranularityEmaPeriodsChange}`)

    // When both the smaller granularity EMAs are within -.01% of each other (meaning they are about to cross or have already)
    // and have a very large negative or positive percent difference between the current trade price
    if (smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.01) && currentPriceChangeFromSmallerEma.isGreaterThanOrEqualTo(-0.001)) {
      // Attempt to submit the trade
      // We're wanting buying at one cent below the current trade price
      submitTrade('buy', message.product_id, message.price.minus(0.01))

      // reset down trending ticks back to zero
      numberOfTicksBelowEma = 0
    }
  }

  // Selling logic:
  // Watch the larger granularity
  //

  lastTickerPrice = clone(message.price)
}
