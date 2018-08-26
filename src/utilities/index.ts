import logger from './logger'
import BigNumber from 'bignumber.js'
import { ema, bollingerbands } from 'technicalindicators'
import { last } from 'lodash'

const highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

const candleChange = candle => candle.close.minus(candle.open).toFixed(2)

const getIndicators = (product, granularity, values) => {
  const indicators = {}

  // for (const period of periods) {
  //   indicators[period] = {}

  //   // Calculate the period's EMA
  //   const avg = ema({ period, values })
  //   indicators[period].ema = avg.map(i => new BigNumber(i.toString()))
  //   logger.debug(`${product}: EMA${period} for last ${granularity / 60}min candle: ${last(indicators[period].ema).toFixed(2)}`)

  //   // Calculate the period's BB
  //   const bb = bollingerbands({ period, values, stdDev: 2.1 })
  //   indicators[period].bb = last(bb)
  //   logger.debug(`${product}: BB${period} ${granularity / 60}min lower: ${indicators[period].bb.lower.toFixed(2)}, upper: ${indicators[period].bb.upper.toFixed(2)}`)

    // Average gain
    // indicators[period].averageGain = new BigNumber(last(averagegain({ period, values })).toString())
    // logger.debug(`${product}: Average gain period ${period} for last ${granularity / 60}min candle: $${indicators[period].averageGain.toFixed(2)}`)

    // Average loss
    // indicators[period].averageLoss = new BigNumber(last(averageloss({ period, values })).toString())
    // logger.debug(`${product}: Average loss period ${period} for last ${granularity / 60}min candle: $${indicators[period].averageLoss.toFixed(2)}`)
  // }

  // Calculate the macd
  // const lastMacd = last(macd({ values, fastPeriod: smallerPeriod, slowPeriod: largerPeriod, signalPeriod: 9 }))
  // lastMacd.MACD = new BigNumber(lastMacd.MACD.toString())
  // lastMacd.signal = new BigNumber(lastMacd.signal.toString())

  // indicators.macd = lastMacd
  // logger.debug(`${product}: MACD for ${granularity / 60}min candles: MACD: ${lastMacd.MACD.toFixed(4)}, signal: ${lastMacd.signal.toFixed(4)}`)

  // indicators.smallerEmaBelowLarger = last(indicators[smallerPeriod].ema).isLessThan(last(indicators[largerPeriod].ema))
  // indicators.largerEmaBelowSmaller = !indicators.smallerEmaBelowLarger
  // indicators.emaPercentDifference = percentChange(last(indicators[largerPeriod].ema), last(indicators[smallerPeriod].ema))
  // indicators.previousEmaPercentDifference = percentChange(nth(indicators[largerPeriod].ema, -2), nth(indicators[smallerPeriod].ema, -2))

  return indicators
}

const getBigNumber = value => {
  if (BigNumber.isBigNumber(value)) {
    return value
  }

  return new BigNumber(value.toString())
}

const percentChange = (previous, current) => {
  previous = getBigNumber(previous)
  current = getBigNumber(current)

  return current.minus(previous).dividedBy(previous).multipliedBy(100)
}

export {
  highLowSpread,
  candleChange,
  getIndicators,
  getBigNumber,
  percentChange
}
