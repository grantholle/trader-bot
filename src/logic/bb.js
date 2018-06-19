'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const { percentChange } = require('../utilities')
const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)

// let previousPriceBelowCount = 0
// let previousPriceAboveCount = 0
// let lastCount = 0
// let previousPriceBelow = false
// let previousPriceAbove = false

module.exports = (message, productData) => {
  let belowLower = true
  let aboveUpper = true

  for (const granularity of granularities) {
    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const ind = productData[granularity].indicators[period]
      const min = (granularity / 60).toString()
      const lowerChange = percentChange(ind.bb.lower, message.price)
      const upperChange = percentChange(ind.bb.upper, message.price)

      logger.silly(`${message.product_id}: ${'0'.repeat(2 - min.length)}${min}min BB${period} lower (${ind.bb.lower.toFixed(2)}): ${lowerChange.toFixed(2)}%, upper (${ind.bb.upper.toFixed(2)}): ${upperChange.toFixed(2)}%`)

      // The faster granularity and period are too quick to really give accurate movements
      if (granularity === smallerGranularity && period === smallerPeriod) {
        continue
      }

      if (lowerChange.isPositive()) {
        belowLower = false
      }

      if (upperChange.isNegative()) {
        aboveUpper = false
      }
    }
  }

  if (belowLower) {
    return 'buy'
  } else if (aboveUpper) {
    return 'sell'
  }

  return false
}
