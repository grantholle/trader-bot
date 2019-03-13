import Position from './position'
import moment, { Moment } from 'moment'
import Product from './product'
import { formatPrice, percentChange } from './utilities'
import coinbaseClient from './clients/coinbaseClient'

export default class PositionManager {
  public positions: Array<Position>
  public lastTradeTime: Moment
  public product: Product
  public live: boolean

  constructor (live: boolean, product: Product) {
    this.live = live
    this.positions = []
    this.product = product
  }

  getOrder (orderId: string): Position {
    return this.positions.find(p => p.buy.orderId === orderId || p.sell.orderId === orderId)
  }

  updatePosition (message: any) {
    const position = this.getOrder(message.order_id)
    position.update(message)
  }

  async trade (side: string, price: BigNumber): Promise<void> {
    const sell = side === 'sell'
    const buy = side === 'buy'

    // Don't make a trade within 5 minutes of the last one
    if (this.lastTradeTime && moment().diff(this.lastTradeTime, 'minutes') < 1) {
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
      const amount = this.live ? await this.getBuyAmount(price) : new BigNumber(1)

      await position.trade(amount, price)

      this.positions.push(position)
    } else if (sell) {
      const sellPrice = price.plus(this.product.quoteIncrement)
      this.positions[0].exit(sellPrice)
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
}