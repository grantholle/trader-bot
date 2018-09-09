import Indicator from './indicator'
import { ema } from 'technicalindicators'

export default class Ema implements Indicator {
  calculate (values: Array<number>) {
    const fasterPeriod: number = 12
    const slowerPeriod: number = 26

    const faster = ema({ period: fasterPeriod, values }).map(i => new BigNumber(i))
    const slower = ema({ period: slowerPeriod, values }).map(i => new BigNumber(i))

    return {
      faster,
      slower
    }
  }
}

