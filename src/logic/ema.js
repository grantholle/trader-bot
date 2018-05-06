'use strict'

const logger = require('../logger')
const { periods, granularities } = require('../config')
const BigNumber = require('bignumber.js')
const { last } = require('lodash')
const { percentChange } = require('../utilities')

const smallerPeriod = Math.min(...periods)
const largerPeriod = Math.max(...periods)
const smallerGranularity = Math.min(...granularities)
const largerGranularity = Math.max(...granularities)

module.exports = (message, productData) => {
  let priceBelowEmas = true
  let priceAboveEmas = true
  let fastAboveSlow = true
  let fastBelowSlow = true

  for (const granularity of granularities) {
    // Check if the current price is above/below the ema's
    for (const period of periods) {
      const ind = productData[granularity].indicators[period]
      const lastEma = new BigNumber(last(ind.ema))
      const percent = percentChange(lastEma, message.price)
      const min = (granularity / 60).toString()

      logger.silly(`${message.product_id}: ${'0'.repeat(2 - min.length)}${min}min EMA${period} (${lastEma.toFixed(2)}): ${percent.toFixed(2)}%`)

      if (percent.isPositive()) {
        priceBelowEmas = false
      } else {
        priceAboveEmas = false
      }
    }
  }

  // Holds the 2 emas of the smaller granularity
  const smallGranularitySmallEma = new BigNumber(last(productData[smallerGranularity].indicators[smallerPeriod].ema))
  const smallGranularityLargeEma = new BigNumber(last(productData[smallerGranularity].indicators[largerPeriod].ema))
  const largeGranularitySmallEma = new BigNumber(last(productData[largerGranularity].indicators[smallerPeriod].ema))
  const largeGranularityLargeEma = new BigNumber(last(productData[largerGranularity].indicators[largerPeriod].ema))

  fastAboveSlow = smallGranularitySmallEma.isGreaterThanOrEqualTo(smallGranularityLargeEma) &&
    largeGranularitySmallEma.isGreaterThanOrEqualTo(largeGranularityLargeEma)

  fastBelowSlow = !fastAboveSlow

  if (priceBelowEmas && fastBelowSlow) {
    return 'buy'
  } else if (priceAboveEmas && fastAboveSlow) {
    return 'sell'
  }

  return false
}
