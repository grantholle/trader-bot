'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const BigNumber = require('bignumber.js')
const { last } = require('lodash')
const { percentChange } = require('../utilities')

const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)
const largerGranularity = Math.max(...granularities)

module.exports = (message, priceTracker) => {
  const productData = priceTracker[message.product_id]
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

      logger.silly(`${message.product_id}: ${granularity / 60}min EMA${period} (${lastEma.toFixed(2)}) difference: ${percent.toFixed(2)}%`)

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
  const priceAboveSmallEma = percentChange(last(smallIndicators[smallerPeriod].ema), message.price).isPositive()
  const smallerGranularityEmaPeriodsChange = smallIndicators.emaPercentDifference
  const smallEmaHasPositiveGain = smallIndicators[smallerPeriod].averageGain.isGreaterThanOrEqualTo(smallIndicators[smallerPeriod].averageLoss)

  // When both the smaller granularity EMAs are within -.01% of each other (meaning they are about to cross or have already)
  // and have a very large negative or positive percent difference between the current trade price
  // if (!smallEmaHasPositiveGain && priceAboveSmallEma && priceBelowOtherEmas && smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.1)) {
  if (!smallEmaHasPositiveGain && priceAboveSmallEma && priceBelowSlowEmas && smallerGranularityEmaPeriodsChange.isGreaterThanOrEqualTo(-0.075)) {
    return 'buy'
  // } else if (smallEmaHasPositiveGain && !priceAboveSmallEma && priceAboveOtherEmas && smallerGranularityEmaPeriodsChange.isLessThanOrEqualTo(0.1)) {
  } else if (smallEmaHasPositiveGain && !priceAboveSmallEma && priceAboveSlowEmas && smallerGranularityEmaPeriodsChange.isLessThanOrEqualTo(0.075)) {
    // When both the smaller granularity EMAs are within .01% of each other (meaning they are about to cross or have already)
    // and have a very large negative or positive percent difference between the current trade price
    return 'sell'
  }

  return false
}
