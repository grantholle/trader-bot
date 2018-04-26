'use strict'

const logger = require('./logger')
const { periods } = require('./config')
const BigNumber = require('bignumber.js')
const { ema, averagegain, averageloss, macd } = require('technicalindicators')
const { last, nth } = require('lodash')
const largerPeriod = Math.max(...periods)
const smallerPeriod = Math.min(...periods)

exports.highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

exports.candleChange = candle => candle.close.minus(candle.open).toFixed(2)

exports.getIndicators = (product, granularity, values) => {
  const indicators = {}

  for (const period of periods) {
    indicators[period] = {}

    // Calculate the period's EMA
    const avg = ema({ period, values })
    indicators[period].ema = avg.map(i => new BigNumber(i.toString()))
    logger.debug(`${product}: EMA${period} for last ${granularity / 60}min candle: ${last(indicators[period].ema).toFixed(2)}`)

    // Average gain
    indicators[period].averageGain = new BigNumber(last(averagegain({ period, values })).toString())
    logger.debug(`${product}: Average gain period ${period} for last ${granularity / 60}min candle: $${indicators[period].averageGain.toFixed(2)}`)

    // Average loss
    indicators[period].averageLoss = new BigNumber(last(averageloss({ period, values })).toString())
    logger.debug(`${product}: Average loss period ${period} for last ${granularity / 60}min candle: $${indicators[period].averageLoss.toFixed(2)}`)
  }

  // Calculate the macd
  const lastMacd = last(macd({ values, fastPeriod: smallerPeriod, slowPeriod: largerPeriod, signalPeriod: 9 }))
  lastMacd.MACD = new BigNumber(lastMacd.MACD.toString())
  lastMacd.signal = new BigNumber(lastMacd.signal.toString())

  indicators.macd = lastMacd
  logger.debug(`${product}: MACD for ${granularity / 60}min candles: MACD: ${lastMacd.MACD.toFixed(4)}, signal: ${lastMacd.signal.toFixed(4)}`)

  indicators.smallerEmaBelowLarger = last(indicators[smallerPeriod].ema).isLessThan(last(indicators[largerPeriod].ema))
  indicators.largerEmaBelowSmaller = !indicators.smallerEmaBelowLarger
  indicators.emaPercentDifference = exports.percentChange(last(indicators[largerPeriod].ema), last(indicators[smallerPeriod].ema))
  indicators.previousEmaPercentDifference = exports.percentChange(nth(indicators[largerPeriod].ema, -2), nth(indicators[smallerPeriod].ema, -2))

  return indicators
}

exports.getBigNumber = value => {
  if (BigNumber.isBigNumber(value)) {
    return value
  }

  return new BigNumber(value.toString())
}

exports.percentChange = (previous, current) => {
  previous = exports.getBigNumber(previous)
  current = exports.getBigNumber(current)

  return current.minus(previous).dividedBy(previous).multipliedBy(100)
}

exports.switchSide = (currentSide, product) => {
  if (currentSide === 'buy') {
    currentSide = 'sell'
  } else {
    currentSide = 'buy'
  }

  logger.verbose(`${product}: Changing side to ${currentSide}`)

  return currentSide
}
