import { AuthenticatedClient } from 'gdax'

const apiUrl = 'https://api.pro.coinbase.com'
const client = new AuthenticatedClient(process.env.GDAX_KEY, process.env.GDAX_SECRET, process.env.GDAX_PASSPHRASE, apiUrl)

export default client
