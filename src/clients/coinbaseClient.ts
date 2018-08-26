import { AuthenticatedClient } from 'gdax'

const apiUrl = 'https://api.pro.coinbase.com'
const client = new AuthenticatedClient(process.env.KEY, process.env.SECRET, process.env.PASSPHRASE, apiUrl)

export default client
