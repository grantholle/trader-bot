# Trader Bot

This is a bot to trade cryptocurrencies on gdax. This is my first attempt at such a thing, and I am inexperienced in technical trading and fairly new in the crypto game.

Its purpose is to be unbiased and generally make the same decision I would by looking at all the relevant data to make a trade. Except I'm often impulsive and exlude some data when watching the market do its thing. The bot is meant to be a 24/7 trader, a great benefit to the crypto market.

It basically makes its decision to buy/trade based on the EMA (exponential moving average). It's an indicator on which I can semi-reliably use to make trades.

## Configuration

Create a `.env` file with the following properties (has examples):

```
# gdax api credentials
KEY=
SECRET=
PASSPHRASE=
PRODUCTS=BTC-USD

# see granularity at https://docs.gdax.com/#get-historic-rates
GRANULARITIES=60,900

# how many candles to store per granularity
PRICE_CACHE_SIZE=400

# comma separated periods you wish to calculate
EMA_PERIODS=12,26

# winston logging levels
LOG_LEVEL=verbose

# use gdax's sandbox urls
USE_SANDBOX=false

# pushbullet key
PUSHBULLET_KEY=
PUSHBULLET_DEVICE_ID=
```

## License

[MIT](license.md)
