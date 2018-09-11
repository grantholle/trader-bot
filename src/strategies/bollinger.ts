import Product from '../product'
import BigNumber from 'bignumber.js'
import { percentChange } from '../utilities'
import { last } from 'lodash'
import Strategy from './strategy'
import { BollingerBandsOutput } from 'technicalindicators/declarations/volatility/BollingerBands'

export default class implements Strategy {
  analyze (product: Product, indicatorData: Array<BollingerBandsOutput>, price: BigNumber): any {
    const lower = last(indicatorData).lower
    const upper = last(indicatorData).upper
    const lowerChange = percentChange(lower, price)
    const upperChange = percentChange(upper, price)

    product.verbose(`Last candle and lower BB change: ${lowerChange.toFixed(4)}%; BB $${lower.toFixed(2)}, Price $${price.toFixed(2)}`)
    product.verbose(`Last candle and upper BB change: ${upperChange.toFixed(4)}%; BB $${upper.toFixed(2)}, Price $${price.toFixed(2)}`)

    if (lowerChange.isNegative()) {
      return 'buy'
    }

    if (upperChange.isPositive()) {
      return 'sell'
    }

    return null
  }
}
