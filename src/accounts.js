'use strict'

const { products } = require('./config')
const gdax = require('./gdaxClient')
const { uniq } = require('lodash')
const logger = require('./logger')
const BigNumber = require('bignumber.js')

module.exports = async () => {
  const accounts = await gdax.getAccounts()
  const currencies = []
  const balances = {}

  for (const product of products) {
    currencies.push(...product.split('-'))
  }

  for (const currency of uniq(currencies)) {
    balances[currency] = accounts.find(a => a.currency === currency)
    balances[currency].available = new BigNumber(balances[currency].available)

    logger.verbose(`${currency} available funds: ${balances[currency].available}`)
  }

  return balances
}
