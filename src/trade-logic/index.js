'use strict'

const submitTrade = require('../trade')
const logic = [
  // require('./techs')
  require('./ema'),
  require('./bb')
]

module.exports = (message, priceTracker) => {
  const results = []

  for (const strategy of logic) {
    const result = strategy(message, priceTracker)

    if (result) {
      results.push(result)
    }
  }

  // If all the results from the logics match, perform the consenus trade
  if (results.length === logic.length && !!results.reduce((a, b) => (a === b) ? a : NaN)) {
    submitTrade(results[0], message.product_id, message.price)
  }
}
