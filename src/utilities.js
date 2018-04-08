'use strict'

const logger = require('./logger')
const { products, periods } = require('./config')
const BigNumber = require('bignumber.js')
const { ema, predictPattern } = require('technicalindicators')
const { last, takeRight } = require('lodash')

exports.highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

exports.candleChange = candle => candle.close.minus(candle.open).toFixed(2)

exports.getIndicators = async (product, granularity, values) => {
  const indicators = {
    ema: {},
    pattern: {}
  }

  for (const period of periods) {
    // Calculate the period's EMA
    const avg = ema({ period, values })
    indicators.ema[period] = avg.map(i => new BigNumber(i.toString()))

    logger.verbose(`${product}: EMA${period} for last ${granularity / 60}min candle: ${last(indicators.ema[period]).toFixed(2)}`)

    // Predict the pattern
    indicators.pattern[period] = await predictPattern({ values: avg })
    logger.verbose(`${product}: pattern detection based on EMA${period}`, indicators.pattern[period])
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
  previous = exports.getBigNumber(previous)
  current = exports.getBigNumber(current)

  return current.minus(previous).dividedBy(previous).multipliedBy(100)
}
