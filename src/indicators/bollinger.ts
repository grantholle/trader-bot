import Indicator from './indicator'
import { bollingerbands } from 'technicalindicators'
import BigNumber from 'bignumber.js'

export default class BollingerBands implements Indicator {
  calculate (values: Array<number>) {
    const period: number = 14
    const stdDev: number = 2.3

    return bollingerbands({
      period,
      values,
      stdDev
    }).map(band => ({
      lower: new BigNumber(band.lower),
      upper: new BigNumber(band.upper)
    }))
  }
}

