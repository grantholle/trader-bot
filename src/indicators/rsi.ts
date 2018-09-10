import Indicator from './indicator'
import { rsi } from 'technicalindicators'
import BigNumber from 'bignumber.js'
import { last } from 'lodash'

export default class Rsi implements Indicator {
  public message: string

  calculate (values: Array<number>) {
    const period: number = 14

    const calculatedRsi = rsi({
      values,
      period
    }).map(rsi => new BigNumber(rsi.toString()))
    const lastRsi = last(calculatedRsi)

    this.message = `RSI $${lastRsi.toFixed(2)}`

    return calculatedRsi
  }
}

