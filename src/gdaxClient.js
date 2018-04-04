'use strict'

const { AuthenticatedClient } = require('gdax')
const { sandbox } = require('./config')
const apiUrl = sandbox ? 'https://api-public.sandbox.gdax.com' : 'https://api.gdax.com'

module.exports = new AuthenticatedClient(process.env.GDAX_KEY, process.env.GDAX_SECRET, process.env.GDAX_PASSPHRASE)
