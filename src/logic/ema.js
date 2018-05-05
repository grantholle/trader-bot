'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const BigNumber = require('bignumber.js')
const { last } = require('lodash')
const { percentChange } = require('../utilities')

const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)
const largerGranularity = Math.max(...granularities)

module.exports = (message, productData) => {
  let priceBelowOtherEmas = true
  let priceAboveOtherEmas = true
  let priceAboveSlowEmas = true
  let priceBelowSlowEmas = true

  for (const granularity of granularities) {
    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const ind = productData[granularity].indicators[period]
      const lastEma = new BigNumber(last(ind.ema))
      const percent = percentChange(lastEma, message.price)
      const min = (granularity / 60).toString()

      logger.silly(`${message.product_id}: ${'0'.repeat(2 - min.length)}${min}min EMA${period} (${lastEma.toFixed(2)}): ${percent.toFixed(2)}%`)

      // Only count the slower 3/4 averages for the "other ema" check
      if (granularity === smallerGranularity && period === smallerPeriod) {
        continue
      }

      // Do a check on the larger/slower ema
      if (granularity === largerGranularity && message.price.isLessThan(lastEma)) {
        priceAboveSlowEmas = false
      } else if (granularity === largerGranularity && message.price.isGreaterThan(lastEma)) {
        priceBelowSlowEmas = false
      }

      if (percent.isPositive()) {
        priceBelowOtherEmas = false
      } else {
        priceAboveOtherEmas = false
      }
    }
  }

  // Holds the 2 emas of the smaller granularity
  const smallIndicators = productData[smallerGranularity].indicators
  // const priceAboveSmallEma = percentChange(last(smallIndicators[smallerPeriod].ema), message.price).isPositive()

  // If the previous smaller period candle closed above the faster ema
  const lastCandleClosedUp = percentChange(last(smallIndicators[smallerPeriod].ema), last(productData[smallerGranularity].allCandles).close).isPositive()

  // The faster ema crossed above or is about to cross above the slow ema
  // Possibly indicating the start of an upward trend or currently in an up trend
  const fastCrossedAboveSlow = smallIndicators.emaPercentDifference.isGreaterThanOrEqualTo(-0.075)

  // The faster ema crossed below or is about to cross below the slow ema
  // Possibly indicating the start of a downward trend or currently in a down trend
  const fastCrossedBelowSlow = smallIndicators.emaPercentDifference.isLessThanOrEqualTo(0.075)

  // This isn't necessarily a good indicator if it jumps rapidly
  // NOT USED NOW
  const smallEmaHasPositiveGain = smallIndicators[smallerPeriod].averageGain.isGreaterThanOrEqualTo(smallIndicators[smallerPeriod].averageLoss)

  if (lastCandleClosedUp && priceBelowSlowEmas && smallIndicators.fastJustCrossedAboveSlow) {
    return 'buy'
  } else if (!lastCandleClosedUp && priceAboveSlowEmas && smallIndicators.fastJustCrossedBelowSlow) {
    return 'sell'
  }

  return false
}
