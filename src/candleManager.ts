import Product from './product'
import Candle from './candle'

export default class CandleManager {
  private candleCacheSize: number
  private interval: NodeJS.Timer
  private client: any
  public candleHistory: Array<Candle>
  public granularity: number
  public minutes: number
  public product: Product

  constructor (product: Product, granularity: number, client: any) {
    this.product = product
    this.granularity = granularity
    this.client = client
    this.candleCacheSize = parseFloat(process.env.PRICE_CACHE_SIZE)
    this.minutes = this.granularity / 60
  }

  async getHistoricalCandles (): Promise<void> {
    this.product.verbose(`Getting historical data at every ${this.minutes} minutes`)

    try {
      const res = await this.client.getProductHistoricRates(this.product.id, { granularity: this.granularity })

      // We get the results newest -> oldest,
      // so reverse that so it's oldest -> newest
      for (let i = res.length - 1; i >= 0; --i) {
        const p = res[i]
        const candle = new Candle(p[3], p[1], p[2], p[4])
        this.candleHistory.push(candle)
      }

      this.trimCandles()

      this.product.debug(`Total historical prices @ ${this.minutes} minutes: ${this.candleHistory.length}`)
    } catch (err) {
      this.product.error(`Failed getting historical pricing data`, err)
    }
  }

  trimCandles (): void {
    if (this.candleCacheSize < this.candleHistory.length) {
      this.candleHistory.splice(0, this.candleHistory.length - this.candleCacheSize)
    }
  }

  startInterval (): void {
    this.interval = setInterval(() => {

    }, this.granularity * 1000)
  }

  clearInterval (): void {
    clearInterval(this.interval)
  }
}