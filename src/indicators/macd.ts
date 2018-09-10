import Indicator from './indicator'
import { macd } from 'technicalindicators'
import { getBigNumber } from '../utilities'
import { last } from 'lodash'

export default class Macd implements Indicator {
  public message: string

  calculate (values: Array<number>) {
    const fastPeriod: number = 5
    const slowPeriod: number = 8
    const signalPeriod: number = 3

    const calculatedMacd = macd({
      values,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    }).map(band => ({
      MACD: getBigNumber(band.MACD),
      histogram: getBigNumber(band.histogram),
      signal: getBigNumber(band.signal)
    }))
    const lastMacd = last(calculatedMacd)

    this.message = `Last MACD signal ${lastMacd.signal ? lastMacd.signal.toFixed(2) : null}; MACD ${lastMacd.MACD ? lastMacd.MACD.toFixed(2) : null}; histogram ${lastMacd.histogram ? lastMacd.histogram.toFixed(2) : null}`

    return calculatedMacd
  }
}

