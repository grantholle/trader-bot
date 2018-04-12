'use strict'

const gdax = require('./gdaxClient')
const { products } = require('./config')
const BigNumber = require('bignumber.js')
const { keyBy } = require('lodash')

module.exports = async () => {
  const gdaxProducts = await gdax.getProducts()

  // Only get the products we need
  // Convert the minimum and maximum purchase amounts to BigNumber objects
  // Key them by the product id
  return keyBy(gdaxProducts.filter(p => products.indexOf(p.id) !== -1).map(p => {
    p.base_min_size = new BigNumber(p.base_min_size)
    p.base_max_size = new BigNumber(p.base_max_size)

    return p
  }), product => product.id)
}
