import { WebsocketClient } from 'gdax'
import { product } from '../config'

const auth = {
  key: process.env.KEY,
  secret: process.env.SECRET,
  passphrase: process.env.PASSPHRASE
}

const options = {
  channels: ['ticker']
}

const connectionUrl = 'wss://ws-feed.pro.coinbase.com'
const client = new WebsocketClient([product], connectionUrl, auth, options)

export default client
