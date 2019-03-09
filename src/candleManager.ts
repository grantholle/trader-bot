import Candle from './candle'
import BigNumber from 'bignumber.js'
import logger from './utilities/logger'
import { last } from 'lodash'

export default class CandleManager {
  public candles: Array<Candle> = []
  public currentCandle: Candle
  private candleCacheSize: number = parseFloat(process.env.PRICE_CACHE_SIZE)

  addHistoricalCandle (open: any, close: any, high: any, low: any): void {
    const candle = new Candle()
    candle.open = new BigNumber(open)
    candle.close = new BigNumber(close)
    candle.high = new BigNumber(high)
    candle.low = new BigNumber(low)

    this.candles.push(candle)
    this.trimCandles()
  }

  tick (price: any): void {
    const bnPrice = new BigNumber(price)

    if (!this.currentCandle) {
      this.currentCandle = new Candle(bnPrice)
      return
    }

    this.currentCandle.tick(bnPrice)
  }

  closeCandle () {
    this.currentCandle.finish()
    logger.silly(`Candle closed: ${this.currentCandle.toString()}`)

    this.candles.push(this.currentCandle.copy())
    this.currentCandle = null
    this.trimCandles()
  }

  splitCandles (): object {
    const split = {
      open: [],
      close: [],
      high: [],
      low: []
    }

    return this.candles.reduce((obj, candle: Candle) => {
      obj.open.push(candle.open.toNumber())
      obj.close.push(candle.close.toNumber())
      obj.high.push(candle.high.toNumber())
      obj.low.push(candle.low.toNumber())

      return obj
    }, split)
  }

  getLastClose (): BigNumber {
    return this.getLastCandle().close
  }

  getLastCandle (): Candle {
    return last(this.candles)
  }

  getCurrentCandle (): Candle {
    return this.currentCandle
  }

  trimCandles (): void {
    if (this.candleCacheSize < this.candles.length) {
      this.candles.splice(0, this.candles.length - this.candleCacheSize)
    }
  }
}
