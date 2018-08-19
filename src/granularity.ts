import Candle from './candle'
import Indicator from './indicators/indicator'

export default class CandleGranularity {
  public milliseconds: number
  public seconds: number
  public minutes: number
  public candles: Array<Candle>
  public closes: Array<number>
  public interval: NodeJS.Timer
  private candleCacheSize: number

  constructor (seconds: number) {
    this.seconds = seconds
    this.minutes = seconds / 60
    this.milliseconds = seconds * 1000
    this.candleCacheSize = parseFloat(process.env.PRICE_CACHE_SIZE)
  }

  addCandle (candle: Candle, trim: boolean = false) {
    this.candles.push(candle)
    this.closes.push(candle.close.toNumber())

    if (trim) {
      this.trimCandles(this.candles)
    }
  }

  trimCandles (candles: Array<any>): void {
    if (this.candleCacheSize < candles.length) {
      candles.splice(0, candles.length - this.candleCacheSize)
    }
  }

  clearInterval (): void {
    clearInterval(this.interval)
  }
}