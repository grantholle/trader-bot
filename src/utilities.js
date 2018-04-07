'use strict'

const logger = require('./logger')
const { products, periods } = require('./config')
const BigNumber = require('bignumber.js')
const { ema } = require('technicalindicators')

exports.highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

exports.candleChange = candle => candle.close.minus(candle.open).toFixed(2)

exports.calculateEma = (product, granularity, values) => {
  const e = {}

  for (const period of periods) {
    const avg = ema({ period, values })
    e[period] = new BigNumber(avg[avg.length - 1].toString())

    logger.verbose(`EMA${period} for ${product} @ ${granularity / 60}min: ${e[period].toFixed(2)}`)
  }

  return e
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
