'use strict'

const { WebsocketClient } = require('gdax')
const { products, sandbox } = require('./config')
const auth = {
  key: process.env.GDAX_KEY,
  secret: process.env.GDAX_SECRET,
  passphrase: process.env.GDAX_PASSPHRASE
}
const options = {
  channels: ['ticker']
}
const connectionUrl = 'wss://ws-feed.gdax.com'

module.exports = new WebsocketClient(products, connectionUrl, auth, options)
