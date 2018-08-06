import CandleManager from './candleManager'
import Product from './product'

export default class Granularity {
  public seconds: number
  public minutes: number
  public candles: CandleManager
  public indicators: any
  public product: Product

  constructor (product: Product, seconds: number) {
    this.seconds = seconds
    this.product = product
    this.minutes = seconds / 60
  }
}