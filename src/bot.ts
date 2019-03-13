import coinbaseClient from './clients/coinbaseClient'
import Product from './product'
import CandleGranularity from './granularity'
import BigNumber from 'bignumber.js'
import { formatPrice } from './utilities'
import PositionManager from './positionManager'

export default class Bot {
  public ready: Promise<any>
  public product: Product
  public granularities: Array<CandleGranularity>
  public positionManager: PositionManager
  private lastPrice: BigNumber
  private triggerTrade: boolean = false
  private live: boolean

  constructor (product: string, granularities: Array<number>, live: boolean = false) {
    this.granularities = granularities.map(g => new CandleGranularity(g))
    this.live = live

    // Handle the asynch stuff with ready so we know when it's safe
    // to start handling messages and executing trades
    this.ready = new Promise(async (resolve, reject) => {
      try {
        // Get the product data from Coinbase
        const coinbaseProducts = await coinbaseClient.getProducts()
        this.product = new Product(coinbaseProducts.find((p: any) => p.id === product))
        this.positionManager = new PositionManager(live, this.product)

        // Get all previous candles from now
        await this.getHistoricalCandles()

        // We're ready to start doing stuff
        resolve(undefined)
      } catch (err) {
        reject(err)
      }
    })
  }

  async handleMessage (message: any): Promise<void> {
    // This is basically a pointless message
    if (message.type === 'ticker' && !message.trade_id) {
      return
    }

    // Handle ticker message
    if (message.type === 'ticker') {
      return this.handleTicker(message)
    }

    // These types are related to my orders
    // received open match done
  }

  async handleTicker (message: any): Promise<void> {
    const price = new BigNumber(message.price)

    this.product.silly(`Trade: ${message.side} @ ${formatPrice(price)}`)

    // Set the current candle price data for each granularity
    for (const granularity of this.granularities) {
      granularity.candleManager.tick(message.price)
    }

    if (this.lastPrice && price.isEqualTo(this.lastPrice)) {
      return
    }

    // Determine if this has hit the stop loss price for any position
    this.positionManager.checkStopLosses(price)

    // Clear out any finished positions
    this.positionManager.checkPositions()

    if (this.triggerTrade) {
      await this.trade(price)
      this.triggerTrade = false
    }

    // The module that handles the logic to make trades
    // traderLogic(message, productData)
    this.lastPrice = price
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
          // [ 0 time, 1 low, 2 high, 3 open, 4 close, 5 volume ]
          granularity.candleManager.addHistoricalCandle(p[3], p[4], p[2], [1])
        }

        this.product.debug(`Total historical prices @ ${granularity.minutes} minutes: ${granularity.candleManager.candles.length}`)
      } catch (err) {
        this.product.error(`Failed getting historical pricing data`, err)
      }
    }
  }

  startIntervals (): void {
    this.positionManager.startDailyTracking()

    for (const granularity of this.granularities) {
      granularity.interval = setInterval(async () => {
        // Add the candle to the set, trimming if necessary
        granularity.candleManager.closeCandle()
      }, granularity.milliseconds)
    }
  }

  async trade (price: BigNumber): Promise<void> {

  }

  clearIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.clearInterval()
    }
  }
}