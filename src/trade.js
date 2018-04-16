'use strict'

const gdax = require('./gdaxClient')
const BigNumber = require('bignumber.js')
const getAccounts = require('./accounts')
const logger = require('./logger')
const gdaxProducts = require('./products')
const { liveTrade } = require('./config')
const pusher = require('./pushbullet')

// Buying requires a little bit of preparation
// We have to check account available balances
const buy = async (product, price, balance, productData) => {
  price = price.minus(productData.quote_increment)

  // Check if there's a pending order from a time that didn't get fulfilled
  // If there is, cancel it? Or don't process the new buy?
  // I say cancel an existing unfulfilled order and place the new one

  const dollars = new BigNumber(balance.USD.available)

  // If we can, calculate the total coins we can buy based on the available USD
  // available USD divided by message.price = number of coins we want to buy
  const coinsToBuy = dollars.dividedBy(price)

  // This will never happen...
  if (coinsToBuy.isGreaterThan(productData.base_max_size)) {
    coinsToBuy = new BigNumber(productData.base_max_size)
  }

  // Check to make sure it's above the min and below the max allowed trade quantities
  if (coinsToBuy.isGreaterThanOrEqualTo(productData.base_min_size)) {
    // Execute the trade
    // Probably poll to make sure the order wasn't rejected somehow
    // Round down at 8 decimal places
    const params = {
      size: coinsToBuy.toFixed(8, BigNumber.ROUND_DOWN),
      price: price.toFixed(2),
      product_id: product
    }

    // If we're live trading, submit the trade
    // Otherwise just send the dummy data back
    if (liveTrade) {
      return gdax.buy(params)
    }

    return params
  }

  logger.info(`Insufficient USD account balance ($${dollars.toFixed(2)}) to make a coin purchase`)
}

const sell = async (product, price, balance, productData) => {
  price = price.plus(productData.quote_increment)

  const currency = product.split('-')[0]
  const coinsToSell = new BigNumber(balance[currency].available)

  // This will probably never happen...
  if (coinsToSell.isGreaterThan(productData.base_max_size)) {
    coinsToSell = new BigNumber(productData.base_max_size)
  }

  // Check to make sure it's above the min and below the max allowed trade quantities
  if (coinsToSell.isGreaterThanOrEqualTo(productData.base_min_size)) {
    // Execute the trade
    // Probably poll to make sure the order wasn't rejected somehow
    // Round down at 8 decimal places
    const params = {
      size: coinsToSell.toFixed(8, BigNumber.ROUND_DOWN),
      price: price.toFixed(2),
      product_id: product
    }

    // If we're live trading, submit the trade
    // Otherwise just send the dummy data back
    if (liveTrade) {
      return gdax.sell(params)
    }

    return params
  }
}

const tradeActions = { buy, sell }

/**
 * Submits a buy or sell trade to gdax
 * Checks account balances and calculates the maximum number
 * you can buy based on product data from gdax
 *
 * @param {String} side `buy` or `sell`
 * @param {String} product The product id you want to buy/sell
 * @param {BigNumber} price The price at which you're submiting your trade
 */
module.exports = async (side, product, price) => {
  let res = false
  let balance
  let productData

  try {
    // Check account balances and product information to make trade
    [balance, productData] = await Promise.all([getAccounts(), gdaxProducts()])
    productData = productData[product]
  } catch (err) {
    logger.error(`Failed fetching account information or gdax product information`, err)
    return
  }

  try {
    res = await tradeActions[side](product, price, balance, productData)
  } catch (err) {
    logger.error(`${product}: Failed placing limit ${side} order`, err)
  }

  // Trade wasn't placed
  if (!res) {
    return
  }

  const message = `${product}: Placed limit ${side} order for ${res.size} coins @ $${res.price}`

  pusher[side](message)
  logger.info(message, res)
}
