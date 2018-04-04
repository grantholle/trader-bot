// The products we're going to trade
exports.products = process.env.GDAX_PRODUCTS.split(',')

// The periods of which to calculate an EMA
exports.periods = process.env.EMA_PERIODS.split(',').map(Number)

// The granularity of historical data (in seconds) https://docs.gdax.com/#get-historic-rates
exports.granularities = process.env.GDAX_GRANULARITIES.split(',').map(Number)

// Whether to use the sandbox api endpoints
exports.sandbox = process.env.USE_SANDBOX === 'true'
