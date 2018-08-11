import Candle from './candle'
import Indicator from './indicator'

export default class Granularity {
  public seconds: number
  public minutes: number
  public candles: Array<Candle>
  public currentCandle: Candle
  public indicators: Array<Indicator>
  private candleCacheSize: number
  private interval: NodeJS.Timer

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

  startInterval (): void {
    this.interval = setInterval(() => {
      this.candles.push(this.currentCandle)
      this.trimCandles()

      for (const indicator of this.indicators) {
        indicator.analyze()
      }
    }, this.seconds * 1000)
  }

  clearInterval (): void {
    clearInterval(this.interval)
  }
}