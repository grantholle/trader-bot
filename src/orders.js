'use strict'

const gdax = require('./gdaxClient')
const logger = require('./logger')

module.exports = async (side, product) => {
  const orders = await gdax.getOrders({ status: 'open', product_id: product })

  for (const order of orders) {
    if (order.side === side) {
      await gdax.cancelOrder(order.id)
      logger.verbose(`${product}: Canceled ${side} order for ${order.size} @ $${order.price}`)
    }
  }
}
