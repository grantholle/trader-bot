'use strict'

const logger = require('./logger')
const { products, periods } = require('./config')
const BigNumber = require('bignumber.js')
const { ema, rsi, bollingerbands } = require('technicalindicators')
const { last, takeRight } = require('lodash')
const largerPeriod = Math.max(...periods)
const smallerPeriod = Math.min(...periods)

exports.highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

exports.candleChange = candle => candle.close.minus(candle.open).toFixed(2)

exports.getIndicators = async (product, granularity, values) => {
  const indicators = {}

  for (const period of periods) {
    indicators[period] = {}

    // Calculate the period's EMA
    const avg = ema({ period, values })
    indicators[period].ema = avg.map(i => new BigNumber(i.toString()))
    logger.debug(`${product}: EMA${period} for last ${granularity / 60}min candle: ${last(indicators[period].ema).toFixed(2)}`)

    // RSI
    indicators[period].rsi = new BigNumber(last(rsi({ period, values })))
    logger.debug(`${product}: RSI${period} for last ${granularity / 60}min candle: ${indicators[period].rsi.toFixed(2)}`)

    // BB
    indicators[period].bb = last(bollingerbands({ period, values, stdDev: 2 }))
    logger.debug(`${product}: BB${period} for last ${granularity / 60}min candle: lower: ${indicators[period].bb.lower.toFixed(2)}, middle: ${indicators[period].bb.middle.toFixed(2)}, high: ${indicators[period].bb.upper.toFixed(2)}`)
  }

  indicators.smallerEmaBelowLarger = last(indicators[smallerPeriod].ema).isLessThan(last(indicators[largerPeriod].ema))
  indicators.largerEmaBelowSmaller = !indicators.smallerEmaBelowLarger
  indicators.emaPercentDifference = exports.percentChange(last(indicators[largerPeriod].ema), last(indicators[smallerPeriod].ema))

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
