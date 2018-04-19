'use strict'

const gdax = require('./gdaxClient')
const logger = require('./logger')
const BigNumber = require('bignumber.js')

module.exports = async (side, product) => {
  const orders = await gdax.getOrders({ status: 'open', product_id: product })

  for (const order of orders) {
    if (order.side === side) {
      await gdax.cancelOrder(order.id)
    }
  }
}
