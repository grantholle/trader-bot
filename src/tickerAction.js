'use strict'

const gdax = require('gdax-trading-toolkit')
const logger = require('./logger')
const pusher = new gdax.utils.PushBullet(process.env.PUSHBULLET_KEY)

module.exports = ticker => {
  logger.log('silly', `${ticker.productId} price change: ${ticker.price.toString()}`, ticker)

  // Compare to the ema
  // If [conditions] are met, place a [side] order
}
