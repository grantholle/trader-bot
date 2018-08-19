import Product from './product'
import Granularity from './granularity'
import Indicator from './indicators/indicator'
import Candle from './candle'

export default class ProductManager {
  public product: Product
  public granularities: Array<Granularity>
  public indicators: Array<Indicator>
  public currentCandle: Candle

  constructor (product: Product, granularities: Array<Granularity>, indicators?: Array<Indicator>) {
    this.product = product
    this.granularities = granularities
    this.indicators = indicators
  }

  startIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.interval = setInterval(() => {
        granularity.addCandle(this.currentCandle)
      }, granularity.milliseconds)
    }
  }
}