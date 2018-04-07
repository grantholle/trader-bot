'use strict'

const client = require('./gdaxClient')
const logger = require('./logger')
const moment = require('moment')
const { products, granularities, periods } = require('./config')
const { ema } = require('technicalindicators')
const { clone } = require('lodash')
const accountBalances = require('./accounts')
const BigNumber = require('bignumber.js')
const { calculateEma, highLowSpread, candleChange } = require('./utilities')

module.exports = () => {
  const priceTracker = {}

  return new Promise(async (resolve, reject) => {
    priceTracker.accounts = accountBalances()

    // Iterate the products
    for (const product of products) {
      priceTracker[product] = {}


      // Within the product, iterate the different granularities
      for (const granularity of granularities) {
        priceTracker[product][granularity] = {}
        const tracker = priceTracker[product][granularity]

        logger.verbose(`Getting historical data for ${product} at every ${granularity / 60} minutes`)

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

          logger.verbose(`${totalResults} historical prices for ${product} @ ${granularity / 60} minutes`)

          // Calculate the EMA using the historic prices
          // for each of the configured periods
          tracker.ema = calculateEma(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))

          const close = new BigNumber(tracker.allCandles[totalResults - 1].close)
          tracker.currentCandle = {
            open: close,
            high: close,
            low: close
          }

          // Start the interval at the granularity in ms
          // To contribute to the running count
          tracker.interval = setInterval(() => {
            const c = tracker.currentCandle

            logger.debug(`${granularity / 60}min candle data: open=${c.open.toFixed(2)}, close=${c.close.toFixed(2)}, ${candleChange(c)} change, ${highLowSpread(c)} spread`)

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

            // Recalculate the EMA
            tracker.ema = calculateEma(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))
          }, granularity * 1000) // Granularity is in seconds
        } catch (err) {
          return reject(err)
        }
      }
    }

    resolve(priceTracker)
  })
}
