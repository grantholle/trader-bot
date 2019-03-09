import coinbaseClient from './clients/coinbaseClient'
import Product from './product'
import CandleGranularity from './granularity'
import BigNumber from 'bignumber.js'
import { formatPrice, percentChange } from './utilities'
import Position from './position'
import moment, { Moment } from 'moment'

export default class Bot {
  public ready: Promise<any>
  public product: Product
  public granularities: Array<CandleGranularity>
  private lastPrice: BigNumber
  private positions: Array<Position> = []
  private triggerBuy: boolean = false
  private triggerSell: boolean = false
  private triggerTrade: boolean = false
  private live: boolean
  private lastTradeTime: Moment = null
  private percentChanges: Array<BigNumber> = []

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

  async handleMessage (message: any): Promise<void> {
    // This is basically a pointless message
    if (message.type === 'ticker' && !message.trade_id) {
      return
    }

    // Handle ticker message
    if (message.type === 'ticker') {
      return this.handleTicker(message)
    }

    // These types are related to my orders
    // received open match done
  }

  async handleTicker (message: any): Promise<void> {
    const price = new BigNumber(message.price)

    this.product.silly(`Trade: ${message.side} @ ${formatPrice(price)}`)

    // Set the current candle price data for each granularity
    for (const granularity of this.granularities) {
      granularity.candleManager.tick(message.price)
    }

    if (this.lastPrice && price.isEqualTo(this.lastPrice)) {
      return
    }

    // Determine if this has hit the stop loss price for any position
    this.checkStopLosses(price)

    // Clear out any finished positions
    this.checkPositions()

    if (this.triggerTrade) {
      await this.trade(price)
      this.triggerTrade = false
    }

    // The module that handles the logic to make trades
    // traderLogic(message, productData)
    this.lastPrice = price
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
          // [ 0 time, 1 low, 2 high, 3 open, 4 close, 5 volume ]
          granularity.candleManager.addHistoricalCandle(p[3], p[4], p[2], [1])
        }

        this.product.debug(`Total historical prices @ ${granularity.minutes} minutes: ${granularity.candleManager.candles.length}`)
      } catch (err) {
        this.product.error(`Failed getting historical pricing data`, err)
      }
    }
  }

  startIntervals (): void {
    this.startDailyTracking()

    for (const granularity of this.granularities) {
      granularity.interval = setInterval(async () => {
        // Add the candle to the set, trimming if necessary
        granularity.candleManager.closeCandle()
      }, granularity.milliseconds)
    }
  }

  async trade (price: BigNumber): Promise<void> {
    const buy = this.triggerBuy
    const sell = this.triggerSell
    this.triggerBuy = false
    this.triggerSell = false

    // Don't make a trade within 5 minutes of the last one
    if (this.lastTradeTime && moment().diff(this.lastTradeTime, 'minutes') < 4) {
      this.product.verbose(`Not enough time has passed to trade again: ${moment().diff(this.lastTradeTime, 'minutes')} minutes`)
      return
    }

    this.lastTradeTime = moment()

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
      const amount = this.live ? await this.getBuyAmount(buyPrice) : new BigNumber(1)

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
    const newPositions = []

    for (const position of this.positions) {
      if (position.positionFinished) {
        position.getProfit()
        this.percentChanges.push(position.profitPercent)
        continue
      }

      newPositions.push(position)
    }

    this.positions = newPositions
  }

  checkStopLosses (price: BigNumber): void {
    for (const position of this.positions) {
      this.product.debug(`Position/price percent change: ${percentChange(position.price, price).toFixed(2)}%`)

      // If the price is less than our stop price and we're not already exiting
      // Exit the position for a loss :(
      if (price.isLessThan(position.stopPrice) && !position.exiting) {
        this.product.info(`Stop loss price met for position, exiting at ${formatPrice(price)} for a loss`)
        position.exit(price.minus(this.product.quoteIncrement))
      }
    }
  }

  startDailyTracking (): void {
    setInterval(() => {
      const max = this.percentChanges.reduce((maxValue, percent) => {
        if (percent.isGreaterThan(maxValue)) {
          return percent
        }

        return maxValue
      }, new BigNumber(0))

      const avg = this.percentChanges.reduce((total, percent) => {
        return total.plus(percent)
      }, new BigNumber(0)).dividedBy(this.percentChanges.length)

      this.product.info(`24 hour stats: ${max.toFixed(2)}% max; ${avg.toFixed(2)}% average`)

      this.percentChanges = []
    }, 1000 * 60 * 60 * 24)
  }

  clearIntervals (): void {
    for (const granularity of this.granularities) {
      granularity.clearInterval()
    }
  }
}