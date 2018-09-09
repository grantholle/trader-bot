import Indicator from './indicator'
import { rsi } from 'technicalindicators'
import BigNumber from 'bignumber.js'

export default class Rsi implements Indicator {
  calculate (values: Array<number>) {
    const period: number = 14

    return rsi({
      values,
      period
    }).map(rsi => new BigNumber(rsi))
  }
}

