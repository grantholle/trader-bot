import BigNumber from 'bignumber.js'

export default class Candle {
  public open: BigNumber
  public close: BigNumber
  public high: BigNumber
  public low: BigNumber

  constructor (open = 0, low = 0, high = 0, close = 0) {
    this.open = new BigNumber(open)
    this.close = new BigNumber(close)
    this.high = new BigNumber(high)
    this.low = new BigNumber(low)
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
