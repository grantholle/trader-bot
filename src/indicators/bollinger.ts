import Indicator from './indicator'
import { bollingerbands } from 'technicalindicators'
import { last } from 'lodash'
import { getBigNumber } from '../utilities'

export default class BollingerBands implements Indicator {
  public message: string

  calculate (values: Array<number>) {
    const period: number = 14
    const stdDev: number = 2.3

    const bands = bollingerbands({
      period,
      values,
      stdDev
    }).map(band => ({
      lower: getBigNumber(band.lower),
      upper: getBigNumber(band.upper)
    }))

    const lastBand = last(bands)

    this.message = `BB higher $${lastBand.upper.toFixed(2)}; BB lower $${lastBand.lower.toFixed(2)}`

    return bands
  }
}

