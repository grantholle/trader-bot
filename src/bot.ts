import coinbaseClient from './clients/coinbaseClient'
import coinbaseWebsocket from './clients/coinbaseWebsocketClient'
import Product from './product'
import ProductManager from './productManager'
import logger from './utilities/logger'
import { clone } from 'lodash'
import { granularities } from './config'

export default class Bot {
  public productManagers: object = {}
  private lastTickerPrice: BigNumber

  async getProductData (products: Array<string>): Promise<void> {
    const cbProducts = await coinbaseClient.getProducts()

    for (const product of cbProducts) {
      if (products.indexOf(product.id) !== -1) {
        const p = new Product(product)
        this.productManagers[product.id] = {}

        for (const granularity of granularities) {
          const manager = new ProductManager(p)
        }
      }
    }
  }

  handleTick (message: any): void {
    // If this isn't a ticker message or is and doesn't have a trade id
    if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
      return
    }

    message.price = new BigNumber(message.price)

    logger.verbose(`${message.product_id}: Trade: ${message.side} @ $${message.price.toFixed(2)}`)

    // If it was the same price as last time, don't continue
    if (this.lastTickerPrice && message.price.isEqualTo(this.lastTickerPrice)) {
      return
    }

    // if (lastTickerPrice) {
    //   priceLogger.info(`${message.product_id}: ${message.price.isGreaterThan(lastTickerPrice) ? '▲' : '▼'} ${message.price.toFixed(2)}`)
    // }

    const productData = priceTracker[message.product_id]

    // Set the current candle price data for each granularity
    for (const granularity of granularities) {
      const candle = productData[granularity].currentCandle

      candle.close = message.price

      // Set the high and low for the candle
      if (message.price.isLessThan(candle.low)) {
        candle.low = message.price
      }

      if (message.price.isGreaterThan(candle.high)) {
        candle.high = message.price
      }
    }

    this.lastTickerPrice = clone(message.price)

    // The module that handles the logic to make trades
    traderLogic(message, productData)
  }
}