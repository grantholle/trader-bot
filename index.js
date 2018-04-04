'use strict'

// Load env variables
require('dotenv').config()

// const gdax = require('gdax-trading-toolkit')

const history = require('./src/history')
const logger = require('./src/logger')

// Start the bot by connecting to the feed first, and gathering historical prices later
// gdax.Factories.GDAX.getSubscribedFeeds(feedConfig, products).then(feed => {
//   // Start a ticker feed for each of the products
//   for (const product of products) {
//     gdax.Core.createTickerTrigger(feed, product, false).setAction(tickerAction)
//   }

  // history(products, granularities, logger).then(prices => {
  //   // This serves as the cache of historical prices by product and granularities
  //   const historicalPrices = prices
  //   // console.log(historicalPrices)
  // })
// }).catch(err => {
//   logger.error(err.message)
// })

