'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const BigNumber = require('bignumber.js')
const { last } = require('lodash')
const { percentChange } = require('../utilities')

// const largerPeriod = Math.max(...periods)
// const largerGranularity = Math.max(...granularities)
// const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)

let numberOfTicksBelowEma = 0
let numberOfTicksAboveEma = 0

const MINIMUM_LOW_PRICE_TREND_UNTIL_TRADE = 3
const MINIMUM_HIGH_PRICE_TREND_UNTIL_TRADE = 3

module.exports = (message, priceTracker) => {
  const productData = priceTracker[message.product_id]

  let priceIsBelowEma = true
  let priceIsAboveEma = true
  let rsiHigh = true
  let rsiLow = true
  let bbHigh = true
  let bbLow = true
  let smallerPeriodIsLower = true
  let smallerPeriodIsHigher = true

  let buyTriggers = 0
  let sellTriggers = 0

  for (const granularity of granularities) {
    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const ind = productData[granularity].indicators[period]
      const lastEma = new BigNumber(last(ind.ema))
      const percent = percentChange(lastEma, message.price)
      const bbUpper = percentChange(ind.bb.upper, message.price)
      const bbLower = percentChange(ind.bb.lower, message.price)

      logger.silly(`${message.product_id}: ${granularity / 60}min EMA${period} (${lastEma.toFixed(2)}) difference: ${percent.toFixed(2)}%`)

      if (ind.rsi.isGreaterThan(70)) {
        logger.silly(`${message.product_id}: Possibly being overbought: ${granularity / 60}min RSI${period} is ${ind.rsi.toFixed(2)}, indicating a possible sell`)
        rsiLow = false
        sellTriggers++
      } else if (ind.rsi.isLessThan(30)) {
        logger.silly(`${message.product_id}: Possibly being oversold: ${granularity / 60}min RSI${period} is ${ind.rsi.toFixed(2)}, indicating possible buy`)
        rsiHigh = false
        buyTriggers++
      } else {
        rsiHigh = false
        rsiLow = false
      }

      if (bbUpper.isGreaterThan(-0.1)) {
        logger.silly(`${message.product_id}: Price ${bbUpper.isPositive() ? 'above' : 'near'} the upper ${granularity / 60}min BB${period} band (${ind.bb.upper.toFixed(2)}) by ${bbUpper.toFixed(2)}%, indicating a possible sell`)
        bbLow = false
        sellTriggers++
      } else if (bbLower.isLessThan(0.1)) {
        logger.silly(`${message.product_id}: Price ${bbLower.isNegative() ? 'below' : 'near'} the lower ${granularity / 60}min BB${period} band (${ind.bb.lower.toFixed(2)}) by ${bbLower.toFixed(2)}%, indicating possible buy`)
        bbHigh = false
        buyTriggers++
      } else {
        bbHigh = false
        bbLow = false
      }

      // Buying logic:
      // Both granularities' and periods' percent change is negative
      if (percent.isPositive()) {
        priceIsBelowEma = false
        buyTriggers++
      } else {
        priceIsAboveEma = false
        sellTriggers++
      }

      // Both granularities' and periods' EMA12 is below the EMA26 (seemingly starting to trend down)
      if (!productData[granularity].indicators.smallerEmaBelowLarger) {
        smallerPeriodIsLower = false
        buyTriggers++
      }

      if (!productData[granularity].indicators.largerEmaBelowSmaller) {
        smallerPeriodIsHigher = false
        sellTriggers++
      }
    }
  }

  if (rsiHigh && bbHigh) {
    logger.silly(`${message.product_id}: All RSI's and BB's are trending up indicating a solid sell opportunity for $${message.price.plus(0.01)}`)
  }

  if (rsiLow && bbLow) {
    logger.silly(`${message.product_id}: All RSI's and BB's are trending down indicating a solid buy opportunity for $${message.price.minus(0.01)}`)
  }

  /**
   * Currently the logic is fairly conservative, but if we want it more aggressive, then...
   * We also need to track the historical percent change of the candles,
   * not only the percent change at the moment. Currently it only executes
   * a buy when it's been trending down for a while, but if there's a big spike
   * then a dip, then a spike again, the currently logic doens't account for the
   * speed at which it could drop after it's been trending up. For example:
   *
   * Suppose the price starts trending up quite a bit, then within one 15min candle,
   * drops significantly. The smaller period and smaller granularity candles will reflect that
   * but it may take a long time for the EMA to actually reflect that, if at all.
   * Potentially, the current trade price wouldn't actually dip the last EMA.
   * Even if it did for a short period of time, the change would eventually be positive, therefore
   * not tracked by the below logic (price below all EMAs).
   * There could be a chance for a buy, but we missed it because of the more conservative logic.
   * The smaller EMAs would cross to trend down, then cross again to trend up before the bigger
   * EMA had time to catch up. Likewise for a selling opportunity.
   *
   * If things have trended up for a long time, suddenly drop, then pick back up again,
   * the price might not cross below that EMA before it starts going back up
   *
   * The percent change of the candle (open, close) would be an indicator in this situation.
   * The price trends up for a while, closing a 15min candle at 130, then drops in the next candle closing at 126.
   * The EMA was 126, so the price is "below all EMAs", but the price is above the large EMA
   * before the 1min EMAs cross to indicate an upward trend.
   *
   * This is a riskier strategy, though. We could prematurely buy and the price drop even lower.
   * Just thinking...
   */

  // Holds the 2 emas of the smaller granularity
  const [emaOne, emaTwo] = periods.map(p => new BigNumber(last(productData[smallerGranularity].indicators[p].ema)))
  const smallerGranularityEmaPeriodsChange = percentChange(emaTwo, emaOne)
  const currentPriceChangeFromSmallerEma = percentChange(emaOne, message.price)
  // const largestEma = new BigNumber(last(productData[largerGranularity].indicators[largerPeriod].ema))

  // Count the number of tick cycles where price is below and the smaller is lower
  // else if the price has jumped relatively a lot, lower the count until it's back to zero
  if (priceIsBelowEma && smallerPeriodIsLower) {
    numberOfTicksBelowEma++
  } else if (numberOfTicksBelowEma > 0 && currentPriceChangeFromSmallerEma.isGreaterThan(0.02)) {
    numberOfTicksBelowEma--
  }

  // It has done this for at least 2? candles
  if (productData[smallerGranularity].consecutiveDownCandles >= MINIMUM_LOW_PRICE_TREND_UNTIL_TRADE) {
    logger.silly(`${message.product_id}: Number of candles where the trade price has been below all EMAs: ${productData[smallerGranularity].consecutiveDownCandles}`)
    logger.silly(`${message.product_id}: Smaller granularity EMA percent difference: ${smallerGranularityEmaPeriodsChange}`)

    // When both the smaller granularity EMAs are within -.01% of each other (meaning they are about to cross or have already)
    // and have a very large negative or positive percent difference between the current trade price
    // if (smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.01) && currentPriceChangeFromSmallerEma.isGreaterThanOrEqualTo(-0.001)) {
    if (smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.05)) {
      // reset down trending ticks back to zero
      numberOfTicksBelowEma = 0

      // Attempt to submit the trade
      // We're wanting buying at one cent below the current trade price
      return 'buy'
    }

    // Just return here from the function since we're not
    // in a selling situation
    return false
  }

  // Count the number of tick cycles where price is above and the smaller EMA is above the larger period's
  // else if the price has dropped a lot relatively, lower the count until it's back to zero
  if (priceIsAboveEma && smallerPeriodIsHigher) {
    numberOfTicksAboveEma++
  } else if (numberOfTicksAboveEma > 0 && currentPriceChangeFromSmallerEma.isLessThan(0.02)) {
    numberOfTicksAboveEma--
  }

  // It has done this for at least 2? ticker cycles
  if (productData[smallerGranularity].consecutiveUpCandles >= MINIMUM_HIGH_PRICE_TREND_UNTIL_TRADE) {
    logger.silly(`${message.product_id}: Number of candles where the trade price has been above all EMAs: ${productData[smallerGranularity].consecutiveUpCandles}`)
    logger.silly(`${message.product_id}: Smaller granularity EMA percent difference: ${smallerGranularityEmaPeriodsChange}`)

    // When both the smaller granularity EMAs are within .01% of each other (meaning they are about to cross or have already)
    // and have a very large negative or positive percent difference between the current trade price
    // if (smallerGranularityEmaPeriodsChange.isLessThanOrEqualTo(0.01) && currentPriceChangeFromSmallerEma.isLessThanOrEqualTo(0.001)) {
    if (smallerGranularityEmaPeriodsChange.isLessThanOrEqualTo(0.05)) {
      // reset down trending ticks back to zero
      numberOfTicksAboveEma = 0

      // Attempt to submit the trade
      // Sell at one cent above the current trade price
      return 'sell'
    }

    return false
  }

  // Put this logic below the ema logic, as it is theoretically more reliable
  // Ignore this logic, as it seems to buy/sell too early
  if (buyTriggers >= 6 && priceIsBelowEma) {
    logger.debug(`${message.product_id}: Buy triggers reached`)
    return 'buy'
  } else if (sellTriggers >= 6 && priceIsAboveEma) {
    logger.debug(`${message.product_id}: Sell triggers reached`)
    return 'sell'
  }
}
