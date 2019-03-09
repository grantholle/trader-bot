import BigNumber from 'bignumber.js'
import { formatPrice, percentChange } from './utilities'
import { cloneDeep, last, first, sortBy } from 'lodash'

export default class Candle {
  public open: BigNumber
  public close: BigNumber
  public high: BigNumber
  public low: BigNumber
  public prices: Array<BigNumber>

  constructor (price: BigNumber = null) {
    this.prices = []

    if (price) {
      this.open = cloneDeep(price)
      this.tick(price)
    }
  }

  tick (price: BigNumber): void {
    this.prices.push(price)
  }

  finish () {
    this.close = cloneDeep(last(this.prices))
    const sorted = sortBy(this.prices, p => p.toNumber())

    this.high = new BigNumber(last(sorted))
    this.low = new BigNumber(first(sorted))
  }

  copy (): Candle {
    return cloneDeep(this)
  }

  toString (): string {
    return `Open: ${formatPrice(this.open)}; Close: ${formatPrice(this.close)}; High: ${formatPrice(this.high)}; Low: ${formatPrice(this.low)}; Spread: ${percentChange(this.low, this.high).toFixed(3)}%; Percent change: ${percentChange(this.open, this.close).toFixed(3)}%`
  }
}
