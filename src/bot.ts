import coinbaseClient from './clients/coinbaseClient'
import Product from './product'
import Candle from './candle'
import CandleGranularity from './granularity'
import indicators from './indicators'
import strategies from './strategies'
import BigNumber from 'bignumber.js'
import { formatPrice } from './utilities'
import Position from './position'

export default class Bot {
  public ready: Promise<any>
  public product: Product
  public granularities: Array<CandleGranularity>
  private lastPrice: BigNumber
  private positions: Array<Position> = []
  private trend: string = null
  private triggerBuy: boolean = false
  private triggerSell: boolean = false
  private live: boolean

  constructor (product: string, granularities: Array<number>, live: boolean = false) {
    this.granularities = granularities.map(g => new CandleGranularity(g))
    this.live = live

    // Handle the asynch stuff with ready so we know when it's safe
    // to start handling messages and executing trades
    this.ready = new Promise(async (resolve, reject) => {
      try {
        // Get the product data from Coinbase
        const coinbaseProducts = await coinbaseClient.getProducts()
        this.product = new Product(coinbaseProducts.find((p: any) => p.id === product))

        // Get all previous candles from now
        await this.getHistoricalCandles()

        // We're ready to start doing stuff
        resolve(undefined)
      } catch (err) {
        reject(err)
      }
    })
  }

  async handleTick (message: any): Promise<void> {
    // If this isn't a ticker message or is and doesn't have a trade id
    if (message.type !== 'ticker' || (message.type === 'ticker' && !message.trade_id)) {
      return
    }

    const price = new BigNumber(message.price)

    this.product.verbose(`Trade: ${message.side} @ ${formatPrice(price)}`)

    if (this.lastPrice && price.isEqualTo(this.lastPrice)) {
      return
    }

    // Set the current candle price data for each granularity
    for (const granularity of this.granularities) {
      granularity.updateCurrentCandle(message.price)
    }

    if (this.triggerBuy || this.triggerSell) {
      await this.trade(price)
      this.triggerBuy = false
      this.triggerSell = false
    }

    // Determine if this has hit the stop loss price for any position
    this.checkStopLosses(price)

    // Clear out any finished positions
    this.checkPositions()

    // The module that handles the logic to make trades
    // traderLogic(message, productData)
    this.lastPrice = new BigNumber(message.price)
  }

  async getHistoricalCandles (): Promise<void> {
    for (const granularity of this.granularities) {
      this.product.verbose(`Getting historical data at every ${granularity.minutes} minutes`)

      try {
        const res = await coinbaseClient.getProductHistoricRates(this.product.id, { granularity: granularity.seconds })

        // We get the results newest -> oldest,
        // so reverse that so it's oldest -> newest
        for (let i = res.length - 1; i >= 0; --i) {
          const p = res[i]
          const candle = new Candle(p[3], p[1], p[2], p[4])
          granularity.addCandle(candle)
        }

        granularity.trimCandles(granularity.candles)

        this.product.debug(`Total historical prices @ ${granularity.minutes} minutes: ${granularity.candles.length}`)
      } catch (err) {
        this.product.error(`Failed getting historical pricing data`, err)
      }
    }
  }

  startIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.interval = setInterval(async () => {
        // Add the candle to the set, trimming if necessary
        granularity.addCandle(granularity.currentCandle, true)

        this.product.verbose(granularity.getLastCandle().toString())

        const price = granularity.getLastClose()
        const sides = []

        // Calculate the technical indicators
        for (const indicatorName of Object.keys(indicators)) {
          const indicator = new indicators[indicatorName]()
          const results = indicator.calculate(granularity.closes)

          granularity.setIndicator(indicatorName, results)

          const strategy = new strategies[indicatorName]()
          sides.push(strategy.analyze(this.product, results, price))
        }

        const allSidesAgree = sides.every((val, i, arr) => val === arr[0])

        if (allSidesAgree) {
          const side = allSidesAgree[0]

          if (side !== null) {
            this.trend = side
          } else if (this.trend !== null) {
            // This is the first candle not following a previous trend, make a move
            this.triggerBuy = this.trend === 'buy'
            this.triggerSell = this.trend === 'sell'

            this.trend = null
          }
        } else {
          this.trend = null
        }
      }, granularity.milliseconds)
    }
  }

  async trade (price: BigNumber): Promise<void> {
    const buy = this.triggerBuy
    const sell = this.triggerSell

    // We're only going to have 2 open positions at a time
    if (this.positions.length === 2 && buy) {
      this.product.info(`Two positions already exist, missed a buy opportunity @ ${formatPrice(price)}`)
      return
    }

    if (sell && this.positions.length === 0) {
      this.product.info(`No existing open positions to perform sell @ ${formatPrice(price)}`)
      return
    }

    if (buy) {
      const position = new Position(this.product, this.live)
      const buyPrice = price.minus(this.product.quoteIncrement)
      const amount = await this.getBuyAmount(buyPrice)

      await position.enter(amount, buyPrice)

      this.positions.push(position)
    } else if (sell) {
      const sellPrice = price.plus(this.product.quoteIncrement)
      this.positions[0].exit(sellPrice)
    }
  }

  async getBuyAmount (price: BigNumber): Promise<BigNumber> {
    const accounts = await coinbaseClient.getAccounts()
    const quoteCurrency = accounts.find(a => a.currency === this.product.quoteCurrency)

    if (!quoteCurrency) {
      return Promise.reject(new Error(`No ${this.product.quoteCurrency} to make purchase`))
    }

    const balance = new BigNumber(quoteCurrency.balance)
    const halfAmount = this.positions.length === 0
    const amount = balance.dividedBy(price)

    return halfAmount ? amount.dividedBy(2) : amount
  }

  checkPositions (): void {
    this.positions = this.positions.filter(p => !p.positionFinished)
  }

  checkStopLosses (price: BigNumber): void {
    for (const position of this.positions) {
      if (price.isLessThanOrEqualTo(position.stopPrice)) {
        position.exit(price.minus(this.product.quoteIncrement))
        break
      }
    }
  }

  clearIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.clearInterval()
    }
  }
}