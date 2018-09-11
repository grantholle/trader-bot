import BigNumber from 'bignumber.js'
import { clone } from 'lodash'

export default class Candle {
  public open: BigNumber
  public close: BigNumber
  public high: BigNumber
  public low: BigNumber

  constructor (open = 0, low = null, high = null, close = null) {
    this.open = new BigNumber(open)
    this.close = close !== null ? new BigNumber(close) : clone(this.open)
    this.high = high !== null ? new BigNumber(high) : clone(this.open)
    this.low = low !== null ? new BigNumber(low) : clone(this.open)
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
}
