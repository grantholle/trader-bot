'use strict'

const { products } = require('./config')
const gdax = require('./gdaxClient')
const { uniq } = require('lodash')

module.exports = async () => {
  const accounts = await gdax.getAccounts()
  const currencies = []
  const balances = {}

  for (const product of products) {
    currencies.push(...product.split('-'))
  }

  for (const currency of uniq(currencies)) {
    balances[currency] = accounts.find(a => a.currency === currency)
  }

  return balances
}
