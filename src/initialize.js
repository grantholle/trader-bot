'use strict'

const client = require('./gdaxClient')
const logger = require('./logger')
const { products, granularities, periods } = require('./config')
const { clone } = require('lodash')
const BigNumber = require('bignumber.js')
const { percentChange, getIndicators, highLowSpread } = require('./utilities')

module.exports = async () => {
  const priceTracker = {}

  // Iterate the products
  for (const product of products) {
    priceTracker[product] = {}

    // Within the product, iterate the different granularities
    for (const granularity of granularities) {
      priceTracker[product][granularity] = {}
      const tracker = priceTracker[product][granularity]

      // Set some defaults for a trend
      tracker.consecutiveUpCandles = 0
      tracker.consecutiveDownCandles = 0

      logger.verbose(`${product}: Getting historical data at every ${granularity / 60} minutes`)

      try {
        // Make the request
        const res = await client.getProductHistoricRates(product, { granularity })

        // Normalize all the results into something more retrievable
        // We get the results newest -> oldest,
        // so reverse that so it's oldest -> newest
        tracker.allCandles = res.reverse().map(p => {
          return {
            low: p[1],
            high: p[2],
            open: p[3],
            close: new BigNumber(p[4])
          }
        })

        const totalResults = tracker.allCandles.length

        // Trim the candles cache to the configured amount
        if (process.env.PRICE_CACHE_SIZE < totalResults) {
          tracker.allCandles.splice(0, totalResults - process.env.PRICE_CACHE_SIZE)
        }

        logger.debug(`${product}: Total historical prices @ ${granularity / 60} minutes: ${totalResults}`)

        // Calculate the EMA using the historic prices
        // for each of the configured periods
        tracker.indicators = await getIndicators(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))

        const close = new BigNumber(tracker.allCandles[totalResults - 1].close)
        tracker.currentCandle = {
          open: close,
          high: close,
          low: close
        }

        // Start the interval at the granularity in ms
        // To contribute to the running count and make calculations
        tracker.interval = setInterval(async () => {
          const c = tracker.currentCandle

          logger.debug(`${product}: ${granularity / 60}min candle data: open: $${c.open.toFixed(2)}, close: $${c.close.toFixed(2)}, low: $${c.low.toFixed(2)}, high: $${c.high.toFixed(2)}; ${percentChange(c.open, c.close).toFixed(2)}% change, ${highLowSpread(c)} spread`)

          // Add the last candle to the historical candles
          tracker.allCandles.push(clone(c))

          // Trim the allCandles down to the config size
          if (process.env.PRICE_CACHE_SIZE < tracker.allCandles.length) {
            tracker.allCandles.splice(0, tracker.allCandles.length - process.env.PRICE_CACHE_SIZE)
          }

          // Start the cycle again, with the previous close as the current open
          c.open = c.close
          c.low = c.close
          c.high = c.close

          // Calculate the indicators
          tracker.indicators = getIndicators(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))
        }, granularity * 1000) // Granularity is in seconds
      } catch (err) {
        return reject(err)
      }
    }
  }

  return priceTracker
}
