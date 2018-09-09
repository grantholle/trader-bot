import Indicator from './indicator'
import { macd } from 'technicalindicators'
import BigNumber from 'bignumber.js'

export default class Macd implements Indicator {
  calculate (values: Array<number>) {
    const fastPeriod: number = 5
    const slowPeriod: number = 8
    const signalPeriod: number = 3

    return macd({
      values,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    }).map(band => ({
      MACD: new BigNumber(band.MACD),
      histogram: new BigNumber(band.histogram),
      signal: new BigNumber(band.signal)
    }))
  }
}

