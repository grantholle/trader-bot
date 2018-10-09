import Product from '../product'
import BigNumber from 'bignumber.js'
import { percentChange, formatPrice } from '../utilities'
import { last } from 'lodash'
import Strategy from './strategy'
import CandleGranularity from '../granularity'

export default class implements Strategy {
  analyze (product: Product, indicatorData: any, granularity: CandleGranularity): any {
    const price = granularity.getLastClose()
    const ema = new BigNumber(last(indicatorData))
    const change = percentChange(ema, price)

    product.verbose(`Last candle and EMA change: ${change.toFixed(4)}%; EMA ${formatPrice(ema)}, Last candle close ${formatPrice(price)}`)

    return null
  }
}
