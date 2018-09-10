import Indicator from './indicator'
import { ema } from 'technicalindicators'
import { last } from 'lodash'
import { getBigNumber } from '../utilities'

export default class Ema implements Indicator {
  public message: string

  calculate (values: Array<number>) {
    const fasterPeriod: number = 12
    const slowerPeriod: number = 26

    const faster = ema({ period: fasterPeriod, values }).map(i => getBigNumber(i))
    const slower = ema({ period: slowerPeriod, values }).map(i => getBigNumber(i))
    const lastFaster = last(faster)
    const slowFaster = last(slower)

    this.message = `EMA${fasterPeriod} $${lastFaster.toFixed(2)}; EMA${slowerPeriod} $${slowFaster.toFixed(2)}`

    return {
      faster,
      slower
    }
  }
}

