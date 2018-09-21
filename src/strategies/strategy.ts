import Product from '../product'
import CandleGranularity from '../granularity'

export default interface Strategy {
  analyze (product: Product, indicatorData: any, granularity: CandleGranularity): any
}