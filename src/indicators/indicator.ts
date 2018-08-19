import Candle from '../candle'
import Product from '../product'
import CandleGranularity from '../granularity'

export default interface Indicator {
  calculate (values: Array<number>, product: Product, granularity: CandleGranularity): any
}