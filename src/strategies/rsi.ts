import Product from '../product'
import { last } from 'lodash'
import Strategy from './strategy'
import CandleGranularity from '../granularity'
import BigNumber from 'bignumber.js'

export default class implements Strategy {
  analyze (product: Product, indicatorData: any, granularity: CandleGranularity): any {
    const lastRsi: BigNumber = last(indicatorData)

    product.verbose(`Last RSI ${lastRsi.toFixed(3)}`)

    if (lastRsi.isGreaterThan(70)) {
      return 'sell'
    }

    if (lastRsi.isLessThan(30)) {
      return 'buy'
    }

    return null
  }
}
