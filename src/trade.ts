import BigNumber from 'bignumber.js'
import coinbase from './clients/coinbaseClient'
import logger from './utilities/logger'
import Product from './product'
import { LimitOrder, OrderResult } from 'gdax'
import { formatPrice, percentChange } from './utilities'

export default class Position {
  public orderId: string = null
  public side: 'buy' | 'sell' = null
  public live: boolean = false
  public filled: boolean = false
  public open: boolean = false
  public cancelled: boolean = false
  public formattedPrice: string
  public price: BigNumber
  public amount: BigNumber
  public product: Product
  public filledSize: BigNumber
  public sellPrice: BigNumber
  public profitPercent: BigNumber = null

  constructor (product: Product, side: 'buy' | 'sell', live: boolean = false) {
    this.product = product
    this.side = side
    this.live = live
    this.filledSize = new BigNumber(0)
  }

 async trade (amount: BigNumber, price: BigNumber): Promise<void> {
    this.price = price
    this.formattedPrice = formatPrice(price)
    this.amount = amount

    // This will never happen...
    if (this.amount.isGreaterThan(this.product.baseMaxSize)) {
      this.amount = new BigNumber(this.product.baseMaxSize)
    }

    // Check to make sure it's above the min and below the max allowed trade quantities
    if (this.amount.isLessThan(this.product.baseMinSize)) {
      logger.info(`Insufficient account balance to ${this.side} coins @ ${this.formattedPrice}`)
      return
    }

    const params: LimitOrder = {
      side: this.side,
      product_id: this.product.id,
      type: 'limit',
      size: this.amount.toFixed(8, BigNumber.ROUND_DOWN),
      price: this.price.toFixed(2),
      post_only: true
    }

    this.product.info(`Placing ${this.side} order: ${params.size} ${this.product.baseCurrency} @ ${this.formattedPrice}`)

    if (!this.live) {
      // Simulate a filled order
      this.filled = true
      this.filledSize = this.amount
      return
    }

    const order: OrderResult = await coinbase.placeOrder(params)

    this.orderId = order.id
    this.open = true

    this.product.debug(`Placed ${this.side} order was successful: ${this.orderId}`)
  }

  async cancel (): Promise<void> {
    await coinbase.cancelOrder(this.orderId)

    this.cancelled = true
    this.product.info(`Cancelling ${this.orderId}`)
  }
}