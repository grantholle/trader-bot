import BigNumber from 'bignumber.js'
import coinbase from './clients/coinbaseClient'
import logger from './utilities/logger'
import Product from './product'
import { LimitOrder, OrderResult, OrderInfo } from 'gdax'
import { formatPrice, percentChange } from './utilities'

export default class Position {
  public id: string = null
  public live: boolean = false
  public filled: boolean = false
  public cancelled: boolean = false
  public sold: boolean = false
  public positionFinished: boolean = false
  public formattedPrice: string
  public price: BigNumber
  public stopPrice: BigNumber
  public amount: BigNumber
  public product: Product
  public filledSize: BigNumber
  public sellPrice: BigNumber
  private pollDelay: number = 5000

  constructor (product: Product, live: boolean = false) {
    this.product = product
    this.live = live
  }

  /**
   * Places a buy order, opening a position
   */
  async enter (amount: BigNumber, price: BigNumber): Promise<void> {
    this.price = price
    this.stopPrice = price.multipliedBy(.999)
    this.formattedPrice = formatPrice(price)
    this.amount = amount

    // This will never happen...
    if (this.amount.isGreaterThan(this.product.baseMaxSize)) {
      this.amount = new BigNumber(this.product.baseMaxSize)
    }

    // Check to make sure it's above the min and below the max allowed trade quantities
    if (this.amount.isGreaterThanOrEqualTo(this.product.baseMinSize)) {
      const params: LimitOrder = {
        side: 'buy',
        product_id: this.product.id,
        type: 'limit',
        size: this.amount.toFixed(8, BigNumber.ROUND_DOWN),
        price: this.price.toFixed(2),
        post_only: true
      }

      this.product.info(`Placing buy order for ${params.size} ${this.product.baseCurrency} @ ${this.formattedPrice}`)

      if (this.live) {
        const order: OrderResult = await coinbase.buy(params)
        this.id = order.id

        this.pollFulfullment()
      } else {
        // Simulate a filled order
        this.filled = true
        this.filledSize = this.amount
      }
    } else {
      this.product.info(`Insufficient ${this.product.quoteCurrency} account balance to make a coin purchase @ ${this.formattedPrice}`)
    }
  }

  /**
   * Sells a position
   *
   * @param price Price at which to sell this position
   */
  async exit (price: BigNumber): Promise<void> {
    if (!this.filledSize.isGreaterThan(0)) {
      this.product.info(`Attempting to sell, but buy order still not filled, cancelling order.`)
      await this.cancel()

      return Promise.resolve()
    }

    this.sellPrice = price
    this.formattedPrice = formatPrice(this.sellPrice)

    // This will probably never happen...
    if (this.filledSize.isGreaterThan(this.product.baseMaxSize)) {
      this.filledSize = new BigNumber(this.product.baseMaxSize)
    }

    // Check to make sure it's above the min and below the max allowed trade quantities
    if (this.filledSize.isGreaterThanOrEqualTo(this.product.baseMinSize)) {
      const params: LimitOrder = {
        side: 'sell',
        type: 'limit',
        size: this.filledSize.toFixed(8, BigNumber.ROUND_DOWN),
        price: this.sellPrice.toFixed(2),
        product_id: this.product.id,
        post_only: true
      }

      this.product.info(`Placing sell order for ${params.size} ${this.product.baseCurrency} @ ${this.formattedPrice}`)

      if (this.live) {
        const order: OrderResult = await coinbase.sell(params)
        this.id = order.id
      } else {
        // Simulate a sold and finished order
        this.sold = true
        this.positionFinished = true
      }
    } else {
      logger.info(`Insufficient ${this.product.baseCurrency} account balance (${this.amount.toFixed(8)}) to sell coins @ ${this.formattedPrice}`)
    }
  }

  /**
   * Cancels the current order (buy or sell)
   */
  async cancel (): Promise<void> {
    await coinbase.cancelOrder(this.id)

    this.cancelled = true
    this.product.info(`Order ${this.id} cancelled`)

    // If the buy order is still unfilled,
    // consider this position done and start
    // a new one when appropriate
    if (!this.filled) {
      this.positionFinished = true
    }
  }

  /**
   * Polls the server to see if the buy order has been fulfilled
   */
  pollFulfullment (): void {
    const interval = setInterval(async () => {
      await this.checkBuyOrder()

      if (this.filled) {
        clearInterval(interval)
        this.product.info(`Buy order settled for ${this.amount.toFixed(8)} @ ${this.formattedPrice} (${this.id})`)
      }
    }, this.pollDelay)
  }

  pollSell (): void {
    const interval = setInterval(async () => {
      await this.checkSellOrder()

      if (this.sold) {
        clearInterval(interval)
        this.product.info(`Sell order settled for ${this.filledSize.toFixed(8)} @ ${this.formattedPrice} (${this.id})`)

        this.positionFinished = true
      }
    }, this.pollDelay)
  }

  async checkBuyOrder (): Promise<void> {
    const order: OrderInfo = await coinbase.getOrder(this.id)

    this.filled = order.settled
    this.filledSize = new BigNumber(order.filled_size)
  }

  async checkSellOrder (): Promise<void> {
    const order: OrderInfo = await coinbase.getOrder(this.id)

    this.sold = order.settled
  }

  getProfit (): void {
    const profitPercent = percentChange(this.price.multipliedBy(this.amount), this.sellPrice.multipliedBy(this.amount))

    this.product.info(`Position profit ${profitPercent.toFixed(2)}%: bought ${this.amount} coins @ ${formatPrice(this.price)}, sold @ ${formatPrice(this.sellPrice)}`)
  }
}