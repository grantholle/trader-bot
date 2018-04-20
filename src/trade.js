'use strict'

const gdax = require('./gdaxClient')
const BigNumber = require('bignumber.js')
const getAccounts = require('./accounts')
const logger = require('./logger')
const gdaxProducts = require('./products')
const { liveTrade, products } = require('./config')
const pusher = require('./pushbullet')
const cancelOpenOrders = require('./orders')
const positions = products.reduce((obj, product) => {
  obj[product] = {
    canSell: true,
    canBuy: true
  }

  return obj
}, {})


// Buying requires a little bit of preparation
// We have to check account available balances
const buy = async (product, price, balance, productData) => {
  price = price.minus(productData.quote_increment)

  const dollars = new BigNumber(balance.USD.available)

  // If we can, calculate the total coins we can buy based on the available USD
  // available USD divided by message.price = number of coins we want to buy
  // To spread the risk, only do about a fourth of total coins we could buy
  const totalCoinPurchase = dollars.dividedBy(price)
  let coinsToBuy = totalCoinPurchase.multipliedBy(.25)

  // This will never happen...
  if (coinsToBuy.isGreaterThan(productData.base_max_size)) {
    coinsToBuy = new BigNumber(productData.base_max_size)
  }

  // If our less-risky buy isn't enough, buy all possible amounts
  if (coinsToBuy.isLessThan(productData.base_min_size)) {
    coinsToBuy = totalCoinPurchase
  }

  // Check to make sure it's above the min and below the max allowed trade quantities
  if (coinsToBuy.isGreaterThanOrEqualTo(productData.base_min_size)) {
    positions[product].canSell = true

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

  logger.info(`Insufficient USD account balance ($${dollars.toFixed(2)}) to make a coin purchase @ $${price.toFixed(2)}`)
  positions[product].canBuy = false
}

const sell = async (product, price, balance, productData) => {
  price = price.plus(productData.quote_increment)

  const currency = product.split('-')[0]
  const totalCoinsAvailable = new BigNumber(balance[currency].available)

  // Offset risk by selling a portion of what we have
  let coinsToSell = totalCoinsAvailable.multipliedBy(.25)

  // This will probably never happen...
  if (coinsToSell.isGreaterThan(productData.base_max_size)) {
    coinsToSell = new BigNumber(productData.base_max_size)
  }

  // If our less-risky sell amount isn't enough, sell everything available
  if (coinsToSell.isLessThan(productData.base_min_size)) {
    coinsToSell = totalCoinsAvailable
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

    positions[product].canBuy = true

    // If we're live trading, submit the trade
    // Otherwise just send the dummy data back
    if (liveTrade) {
      return gdax.sell(params)
    }

    return params
  }

  logger.info(`Insufficient ${currency} account balance (${coinsToSell.toFixed(8)}) to sell coins @ $${price.toFixed(2)}`)
  positions[product].canSell = false
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

  // Using flags when we've made purchases/buys to cut down on api usage
  if ((side === 'buy' && !positions[product].canBuy) || (side === 'sell' && !positions[product].canSell)) {
    logger.debug(`${product}: Not in position to ${side}. Potential ${side} @ $${price.toFixed(2)}`)
    return
  }

  try {
    // Check account balances and product information to make trade
    [balance, productData] = await Promise.all([getAccounts(), gdaxProducts()])
    productData = productData[product]
  } catch (err) {
    logger.error(`Failed fetching account information or gdax product information`, err)
    return
  }

  try {
    // Cancel open orders for this side and product
    // If it fails, that's ok, attempt to trade anyway
    await cancelOpenOrders(side, product)
  } catch (err) {
    logger.error(`${product}: Failed cancelling ${side} orders`)
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
