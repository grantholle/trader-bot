import BigNumber from 'bignumber.js'
import { formatPrice, percentChange } from './utilities'

export default class Candle {
  public open: BigNumber
  public close: BigNumber
  public high: BigNumber
  public low: BigNumber

  constructor (open = 0, low = null, high = null, close = null) {
    this.open = new BigNumber(open)
    this.close = new BigNumber(close !== null ? close : open)
    this.high = new BigNumber(high !== null ? high : open)
    this.low = new BigNumber(low !== null ? low : open)
  }

  tick (price: number) {
    this.close = new BigNumber(price)

    if (this.close.isLessThan(this.low)) {
      this.low = new BigNumber(price)
    }

    if (this.close.isGreaterThan(this.high)) {
      this.high = new BigNumber(price)
    }
  }

  copy () {
    return new Candle(this.open.toNumber(), this.low.toNumber(), this.high.toNumber(), this.close.toNumber())
  }

  toString (): string {
    return `Open: ${formatPrice(this.open)}; Close: ${formatPrice(this.close)}; High: ${formatPrice(this.high)}; Low: ${formatPrice(this.low)}; Spread: ${percentChange(this.low, this.high).toFixed(3)}%; Percent change: ${percentChange(this.open, this.close).toFixed(3)}%`
  }
}
