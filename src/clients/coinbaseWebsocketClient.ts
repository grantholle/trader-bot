import { WebsocketClient } from 'gdax'
import { products } from '../config'

const auth = {
  key: process.env.GDAX_KEY,
  secret: process.env.GDAX_SECRET,
  passphrase: process.env.GDAX_PASSPHRASE
}

const options = {
  channels: ['ticker']
}

const connectionUrl = 'wss://ws-feed.pro.coinbase.com'
const client = new WebsocketClient(products, connectionUrl, auth, options)

export default client
