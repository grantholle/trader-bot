'use strict'

const submitTrade = require('../trade')
const logic = [
  require('./techs')
]

module.exports = (message, priceTracker) => {
  for (const strategy of logic) {
    const result = strategy(message, priceTracker)

    if (result) {
      submitTrade(result, message.product_id, message.price)
      break
    }
  }
}