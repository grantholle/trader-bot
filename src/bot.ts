import coinbaseClient from './clients/coinbaseClient'
import Product from './product'
import { clone } from 'lodash'
// import { granularities } from './config'
import Candle from './candle'
import CandleGranularity from './granularity'
import ProductManager from './productManager'

export default class Bot {
  public productManager: ProductManager
  public granularities: Array<CandleGranularity>
  private lastTickerPrice: BigNumber

  constructor (granularities: Array<number>) {
    this.granularities = granularities.map(g => new CandleGranularity(g))
  }

  async getProductData (products: Array<string>): Promise<void> {
    const coinbaseProducts = await coinbaseClient.getProducts()

    for (const product of coinbaseProducts) {
      if (products.indexOf(product.id) !== -1) {
        this.productManager = new ProductManager(new Product(product), this.granularities)
        break
      }
    }
  }

  handleTick (message: any): void {
    // If this isn't a ticker message or is and doesn't have a trade id
    if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
      return
    }

    message.price = new BigNumber(message.price)
    const product = this.productManagers[message.product_id]

    product.silly(`Trade: ${message.side} @ $${message.price.toFixed(2)}`)

    // If it was the same price as last time, don't continue
    if (this.lastTickerPrice && message.price.isEqualTo(this.lastTickerPrice)) {
      return
    }

    // if (lastTickerPrice) {
    //   priceLogger.info(`${message.product_id}: ${message.price.isGreaterThan(lastTickerPrice) ? '▲' : '▼'} ${message.price.toFixed(2)}`)
    // }

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

  async getHistoricalCandles (product: Product): Promise<void> {
    for (const granularity of product.granularities) {
      product.verbose(`Getting historical data at every ${granularity.minutes} minutes`)

      try {
        const res = await coinbaseClient.getProductHistoricRates(product.id, { granularity: granularity.seconds })

        // We get the results newest -> oldest,
        // so reverse that so it's oldest -> newest
        for (let i = res.length - 1; i >= 0; --i) {
          const p = res[i]
          const candle = new Candle(p[3], p[1], p[2], p[4])
          granularity.candles.push(candle)
        }

        granularity.trimCandles()

        product.debug(`Total historical prices @ ${granularity.minutes} minutes: ${granularity.candles.length}`)
      } catch (err) {
        product.error(`Failed getting historical pricing data`, err)
      }
    }
  }
}