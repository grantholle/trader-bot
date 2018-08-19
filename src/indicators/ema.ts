import Indicator from './indicator'
import { ema } from 'technicalindicators'
import Product from '../product'
import Granularity from '../granularity'
import { last } from 'lodash'

export default class Ema implements Indicator {
  private fasterPeriod: number = 12
  private slowerPeriod: number = 26

  analyze (values: Array<number>, product: Product, granularity: Granularity) {
    const fasterEma = ema({ period: this.fasterPeriod, values }).map(i => new BigNumber(i))
    const lastFastAvg = last(fasterEma)

    const slowerEma = ema({ period: this.slowerPeriod, values }).map(i => new BigNumber(i))
    const lastSlowAvg = last(slowerEma)

    product.verbose(`${granularity.minutes}min EMA${this.fasterPeriod}: ${lastFastAvg.toFixed(2)}; EMA${this.slowerPeriod}: ${lastSlowAvg.toFixed(2)}`)

    return lastFastAvg.isGreaterThan(lastSlowAvg) ? 'sell' : 'buy'
  }
}

