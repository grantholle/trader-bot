'use strict'

const client = require('./gdaxClient')
const logger = require('./logger')
const { products, granularities, periods } = require('./config')
const { clone } = require('lodash')
const accountBalances = require('./accounts')
const BigNumber = require('bignumber.js')
const { percentChange, getIndicators, highLowSpread } = require('./utilities')

const smallerPeriod = Math.min(...periods)
const smallerGranularity = Math.min(...granularities)
const largerGranularity = Math.max(...granularities)

module.exports = () => {
  const priceTracker = {}

  return new Promise(async (resolve, reject) => {
    // Log the balances at the beginning of the trading period for kicks and giggles
    accountBalances().catch(logger.error)

    // Iterate the products
    for (const product of products) {
      priceTracker[product] = {}

      // Within the product, iterate the different granularities
      for (const granularity of granularities) {
        priceTracker[product][granularity] = {}
        const tracker = priceTracker[product][granularity]

        // Set some defaults for a trend
        tracker.consecutiveUpCandles = 0
        tracker.consecutiveDownCandles = 0

        logger.verbose(`${product}: Getting historical data at every ${granularity / 60} minutes`)

        try {
          // Make the request
          const res = await client.getProductHistoricRates(product, { granularity })

          // Normalize all the results into something more retrievable
          // We get the results newest -> oldest,
          // so reverse that so it's oldest -> newest
          tracker.allCandles = res.reverse().map(p => {
            return {
              low: p[1],
              high: p[2],
              open: p[3],
              close: new BigNumber(p[4])
            }
          })

          const totalResults = tracker.allCandles.length

          // Trim the candles cache to the configured amount
          if (process.env.PRICE_CACHE_SIZE < totalResults) {
            tracker.allCandles.splice(0, totalResults - process.env.PRICE_CACHE_SIZE)
          }

          logger.debug(`${product}: Total historical prices @ ${granularity / 60} minutes: ${totalResults}`)

          // Calculate the EMA using the historic prices
          // for each of the configured periods
          tracker.indicators = await getIndicators(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))

          const close = new BigNumber(tracker.allCandles[totalResults - 1].close)
          tracker.currentCandle = {
            open: close,
            high: close,
            low: close
          }

          // Start the interval at the granularity in ms
          // To contribute to the running count and make calculations
          tracker.interval = setInterval(async () => {
            const c = tracker.currentCandle

            logger.debug(`${product}: ${granularity / 60}min candle data: open=${c.open.toFixed(2)}, close=${c.close.toFixed(2)}, ${percentChange(c.open, c.close).toFixed(2)}% change, ${highLowSpread(c)} spread`)

            // Add the last candle to the historical candles
            tracker.allCandles.push(clone(c))

            // Trim the allCandles down to the config size
            if (process.env.PRICE_CACHE_SIZE < tracker.allCandles.length) {
              tracker.allCandles.splice(0, tracker.allCandles.length - process.env.PRICE_CACHE_SIZE)
            }

            // Start the cycle again, with the previous close as the current open
            c.open = c.close
            c.low = c.close
            c.high = c.close

            // Recalculate the EMA
            tracker.indicators = getIndicators(product, granularity, tracker.allCandles.map(c => c.close.toNumber()))

            // Check if the candles are up from the previous one
            tracker.lastCandleUp = c.close.isGreaterThanOrEqualTo(tracker.allCandles[tracker.allCandles.length - 2].close)
            tracker.lastCandleDown = !tracker.lastCandleUp

            // Only track this for the last 10 candles
            // After 10 candles worth of data has been collected,
            // The total of down and up candles should equal 10
            if (tracker.lastCandleUp && tracker.consecutiveUpCandles < 10) {
              tracker.consecutiveUpCandles++
            } else if (tracker.consecutiveUpCandles > 0 && tracker.lastCandleDown) {
              tracker.consecutiveUpCandles--
            }

            if (tracker.lastCandleDown && tracker.consecutiveDownCandles < 10) {
              tracker.consecutiveDownCandles++
            } else if (tracker.consecutiveDownCandles > 0 && tracker.lastCandleUp) {
              tracker.consecutiveDownCandles--
            }

            logger.debug(`${product}: ${granularity / 60}min candle trended ${tracker.lastCandleDown ? 'down' : 'up'} from previous candle`)
            logger.debug(`${product}: ${granularity / 60}min consecutive up candles: ${tracker.consecutiveUpCandles}; consecutive down ${tracker.consecutiveDownCandles}`)

            // Determine if this is the fast ema is about to or has already crossed the slow ema
            if (granularity === smallerGranularity) {
              // The fast is almost greater than the slow
              const fastIsAboveSlow = tracker.indicators.emaPercentDifference.isGreaterThanOrEqualTo(-0.075)

              // The previous ema comparison was less than almost-zero
              const previousEmaUncrossedBelow = tracker.indicators.previousEmaPercentDifference.isLessThan(0.025)

              // These indicate a buy
              tracker.indicators.fastJustCrossedAboveSlow = fastIsAboveSlow && previousEmaUncrossedBelow

              // The fast ema is almost lower than the slow ema
              const fastIsBelowSlow = tracker.indicators.emaPercentDifference.isLessThanOrEqualTo(0.075)


              // The previous ema comparison was greater than almost-zero
              const previousEmaUncrossedAbove = tracker.indicators.previousEmaPercentDifference.isGreaterThan(-0.025)

              // These indicate a sell
              tracker.indicators.fastJustCrossedBelowSlow = fastIsBelowSlow && previousEmaUncrossedAbove
            }

            // Do some analysis on the last candle...
          }, granularity * 1000) // Granularity is in seconds
        } catch (err) {
          return reject(err)
        }
      }
    }

    resolve(priceTracker)
  })
}
