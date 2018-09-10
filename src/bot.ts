import coinbaseClient from './clients/coinbaseClient'
import Product from './product'
import { clone } from 'lodash'
import Candle from './candle'
import CandleGranularity from './granularity'
import indicators from './indicators'
import BigNumber from 'bignumber.js'

export default class Bot {
  public ready: Promise<any>
  public product: Product
  private currentCandle: Candle
  public granularities: Array<CandleGranularity>

  constructor (product: string, granularities: Array<number>) {
    this.granularities = granularities.map(g => new CandleGranularity(g))

    // Handle the asynch stuff with ready so we know when it's safe
    // to start handling messages and executing trades
    this.ready = new Promise(async (resolve, reject) => {
      try {
        // Get the product data from Coinbase
        const coinbaseProducts = await coinbaseClient.getProducts()
        this.product = new Product(coinbaseProducts.find((p: any) => p.id === product))

        // Get all previous candles from now
        await this.getHistoricalCandles()

        // We're ready to start doing stuff
        resolve(undefined)
      } catch (err) {
        reject(err)
      }
    })
  }

  handleTick (message: any): void {
    // If this isn't a ticker message or is and doesn't have a trade id
    if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
      return
    }

    const price = new BigNumber(message.price)

    this.product.silly(`Trade: ${message.side} @ $${price.toFixed(2)}`)

    // Set the current candle price data for each granularity
    for (const granularity of this.granularities) {
      granularity.updateCurrentCandle(message.price)
    }

    // The module that handles the logic to make trades
    // traderLogic(message, productData)
  }

  async getHistoricalCandles (): Promise<void> {
    for (const granularity of this.granularities) {
      this.product.verbose(`Getting historical data at every ${granularity.minutes} minutes`)

      try {
        const res = await coinbaseClient.getProductHistoricRates(this.product.id, { granularity: granularity.seconds })

        // We get the results newest -> oldest,
        // so reverse that so it's oldest -> newest
        for (let i = res.length - 1; i >= 0; --i) {
          const p = res[i]
          const candle = new Candle(p[3], p[1], p[2], p[4])
          granularity.addCandle(candle)
        }

        granularity.trimCandles(granularity.candles)

        this.product.debug(`Total historical prices @ ${granularity.minutes} minutes: ${granularity.candles.length}`)
      } catch (err) {
        this.product.error(`Failed getting historical pricing data`, err)
      }
    }
  }

  startIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.interval = setInterval(() => {
        // Add the candle to the set, trimming if necessary
        granularity.addCandle(granularity.currentCandle, true)

        // Recalculate the technical indicators
        for (const obj of Object.keys(indicators)) {
          const indicator = new indicators[obj]()
          granularity.setIndicator(obj, indicator.calculate(granularity.closes))
          this.product.verbose(indicator.message)
        }
      }, granularity.milliseconds)
    }
  }

  clearIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.clearInterval()
    }
  }
}