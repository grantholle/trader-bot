'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const BigNumber = require('bignumber.js')
const { last } = require('lodash')
const { percentChange } = require('../utilities')

const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)

module.exports = (message, priceTracker) => {
  const productData = priceTracker[message.product_id]
  let priceBelowOtherEmas = true
  let priceAboveOtherEmas = true

  for (const granularity of granularities) {
    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const ind = productData[granularity].indicators[period]
      const lastEma = new BigNumber(last(ind.ema))
      const percent = percentChange(lastEma, message.price)

      logger.silly(`${message.product_id}: ${granularity / 60}min EMA${period} (${lastEma.toFixed(2)}) difference: ${percent.toFixed(2)}%`)

      // Only count the slower 3/4 averages
      if (granularity === smallerGranularity && period === smallerPeriod) {
        continue
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
  const priceAboveSmallEma = percentChange(last(smallIndicators[smallerPeriod].ema), message.price).isPositive()
  const smallerGranularityEmaPeriodsChange = smallIndicators.emaPercentDifference
  const positiveGain = smallIndicators[smallerPeriod].averageGain.isGreaterThan(smallIndicators[smallerPeriod].averageLoss)

  // When both the smaller granularity EMAs are within -.01% of each other (meaning they are about to cross or have already)
  // and have a very large negative or positive percent difference between the current trade price
  if (!positiveGain && priceAboveSmallEma && priceBelowOtherEmas && smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.05)) {
    return 'buy'
  } else if (positiveGain && !priceAboveSmallEma && priceAboveOtherEmas && smallerGranularityEmaPeriodsChange.isLessThanOrEqualTo(0.05)) {
    // When both the smaller granularity EMAs are within .01% of each other (meaning they are about to cross or have already)
    // and have a very large negative or positive percent difference between the current trade price
    return 'sell'
  }

  return false
}
