import * as dotenv from 'dotenv'

dotenv.config()

// The products we're going to trade
export const product: string = process.env.PRODUCT

// The granularity of historical data (in seconds) https://docs.gdax.com/#get-historic-rates
export const granularities: Array<number> = process.env.GRANULARITIES ? process.env.GRANULARITIES.split(',').map(Number) : [60, 900]

// Whether to submit real trades to gdax or just log potential ones
export const liveTrade: boolean = process.env.LIVE_TRADE && process.env.LIVE_TRADE === 'true'
