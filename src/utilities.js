'use strict'

const logger = require('./logger')
const { products, periods } = require('./config')
const BigNumber = require('bignumber.js')
const { ema, rsi, bollingerbands } = require('technicalindicators')
const { last, takeRight } = require('lodash')

exports.highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

exports.candleChange = candle => candle.close.minus(candle.open).toFixed(2)

exports.getIndicators = async (product, granularity, values) => {
  const indicators = {
    ema: {},
    rsi: {},
    bb: {}
  }

  for (const period of periods) {
    // Calculate the period's EMA
    const avg = ema({ period, values })
    indicators.ema[period] = avg.map(i => new BigNumber(i.toString()))
    logger.verbose(`${product}: EMA${period} for last ${granularity / 60}min candle: ${last(indicators.ema[period]).toFixed(2)}`)

    // RSI
    indicators.rsi[period] = new BigNumber(last(rsi({ period, values })))
    logger.verbose(`${product}: RSI${period} for last ${granularity / 60}min candle: ${indicators.rsi[period].toFixed(2)}`)

    // BB
    indicators.bb[period] = last(bollingerbands({ period, values, stdDev: 2 }))
    logger.verbose(`${product}: BB${period} for last ${granularity / 60}min candle: lower: ${indicators.bb[period].lower.toFixed(2)}, middle: ${indicators.bb[period].middle.toFixed(2)}, high: ${indicators.bb[period].upper.toFixed(2)}`)
  }

  return indicators
}

exports.getBigNumber = value => {
  if (BigNumber.isBigNumber(value)) {
    return value
  }

  return new BigNumber(value.toString())
}

exports.percentChange = (previous, current) => {
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
