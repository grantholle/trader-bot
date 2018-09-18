import BigNumber from 'bignumber.js'

const highLowSpread = candle => candle.high.minus(candle.low).toFixed(2)

const candleChange = candle => candle.close.minus(candle.open).toFixed(2)

const getBigNumber = (value: any) => {
  if (!value) {
    return null
  }

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

const formatPrice = (price: BigNumber): string => {
  return `$${price.toFixed(2)}`
}

export {
  highLowSpread,
  candleChange,
  getBigNumber,
  percentChange
}
