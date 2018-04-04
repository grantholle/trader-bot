'use strict'

const client = require('./gdaxClient')
const logger = require('./logger')
const moment = require('moment')
const { products, granularities } = require('./config')

module.exports = () => {
  const history = {}

  return new Promise(async (resolve, reject) => {
    // Iterate the products
    for (const product of products) {
      history[product] = {}

      // Within the product, iterate the different granularities
      for (const granularity of granularities) {
        history[product][granularity] = {}

        logger.log('verbose', `Getting historical data for ${product} at every ${granularity} seconds`)

        try {
          // Make the request
          const res = await client.getProductHistoricRates(product, { granularity })

          // Normalize all the results into something more retrievable
          // We get the results newest -> oldest,
          // so reverse that so it's oldest -> newest
          history[product][granularity].allCandles = res.map(p => {
            return {
              timestamp: p[0],
              low: p[1],
              high: p[2],
              open: p[3],
              close: p[4]
              // volume: p[5]
            }
          }).reverse()

          const totalResults = history[product][granularity].allCandles.length

          // Trim the candles cache to the configured amount
          if (process.env.PRICE_CACHE_SIZE < totalResults) {
            history[product][granularity].allCandles.splice(0, totalResults - process.env.PRICE_CACHE_SIZE)
          }

          logger.log('verbose', `${totalResults} historical prices for ${product} @ ${granularity} seconds`)
          logger.log('debug', `Last time period: ${moment(history[product][granularity].allCandles[totalResults - 1].timestamp * 1000).format('MM/DD HH:mm')}`)
        } catch (err) {
          return reject(err)
        }
      }

      // After all the granularities have been fetched,
      // we need to populate some "in progress" buckets
      // But I don't know how to do that exactly, since we're starting
      // at a random time
    }

    resolve(history)
  })
}
