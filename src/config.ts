import * as dotenv from 'dotenv'

dotenv.config()

// The products we're going to trade
export const product = process.env.PRODUCT

// The periods of which to calculate an EMA
export const periods = process.env.EMA_PERIODS ? process.env.EMA_PERIODS.split(',').map(Number) : [12, 26]

// The granularity of historical data (in seconds) https://docs.gdax.com/#get-historic-rates
export const granularities = process.env.GRANULARITIES ? process.env.GRANULARITIES.split(',').map(Number) : [60, 900]

// Whether to use the sandbox api endpoints
export const sandbox = process.env.USE_SANDBOX === 'true'

// Whether to submit real trades to gdax or just log potential ones
export const liveTrade = process.env.LIVE_TRADE && process.env.LIVE_TRADE === 'true'
