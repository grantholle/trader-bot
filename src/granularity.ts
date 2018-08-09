import Candle from './candle'

export default class Granularity {
  public seconds: number
  public minutes: number
  public candles: Array<Candle>
  public indicators: any
  private candleCacheSize: number

  constructor (seconds: number) {
    this.seconds = seconds
    this.minutes = seconds / 60
    this.candleCacheSize = parseFloat(process.env.PRICE_CACHE_SIZE)
  }

  trimCandles (): void {
    if (this.candleCacheSize < this.candles.length) {
      this.candles.splice(0, this.candles.length - this.candleCacheSize)
    }
  }
}