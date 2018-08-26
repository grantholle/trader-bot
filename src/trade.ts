import BigNumber from 'bignumber.js'
import coinbase from './clients/coinbaseClient'
import logger from './utilities/logger'
import Product from './product'

/**
 * Tracks all data for a trade
 * including the stop loss
 *
 * Should I ping the order to see if it's fulfilled?
 */
export class Trade {
  public open: boolean = true
  public live: boolean = false
  public price: BigNumber
  public stopLossPrice: BigNumber
  public amount: BigNumber
  public id: string = null
  public product: Product

  // public side: string Will it track purely on a trade-by-trade basis?
  // A buy is executed, then this amount is sold at the appropriate time?

  constructor (product: Product, price: BigNumber, amount: BigNumber, live?: boolean) {
    this.price = price
    this.amount = amount
    this.product = product

    if (typeof live !== 'undefined') {
      this.live = live
    }

    // What percentage are you willing to lose before selling? 3?
    this.stopLossPrice = this.price.multipliedBy(.97)
  }

  async buy (): Promise<void> {
    const price = this.price.minus(this.product.quoteIncrement)

    let dollars = new BigNumber(balance.USD.available).dividedBy(2)

    // If we can, calculate the total coins we can buy based on the available USD
    // available USD divided by message.price = number of coins we want to buy
    let coinsToBuy = dollars.dividedBy(price)

    // This will never happen...
    if (coinsToBuy.isGreaterThan(this.product.baseMaxSize)) {
      coinsToBuy = new BigNumber(this.product.baseMaxSize)
    }

    // Check to make sure it's above the min and below the max allowed trade quantities
    if (coinsToBuy.isGreaterThanOrEqualTo(this.product.baseMinSize)) {
      positions[product].sell = true

      // Execute the trade
      // Probably poll to make sure the order wasn't rejected somehow
      // Round down at 8 decimal places
      const params = {
        size: coinsToBuy.toFixed(8, BigNumber.ROUND_DOWN),
        price: price.toFixed(2),
        product_id: product,
        post_only: true
      }

      return gdax.buy(params)
    }

    logger.info(`Insufficient USD account balance ($${dollars.toFixed(2)}) to make a coin purchase @ $${price.toFixed(2)}`)
    positions[product].buy = false
  }

  async sell (): Promise<void> {
    price = price.plus(this.product.quoteIncrement)

    const currency = product.split('-')[0]
    let coinsToSell = new BigNumber(balance[currency].available).dividedBy(2)

    // This will probably never happen...
    if (coinsToSell.isGreaterThan(this.product.baseMaxSize)) {
      coinsToSell = new BigNumber(this.product.baseMaxSize)
    }

    // Check to make sure it's above the min and below the max allowed trade quantities
    if (coinsToSell.isGreaterThanOrEqualTo(this.product.baseMinSize)) {
      positions[product].buy = true

      // Execute the trade
      // Probably poll to make sure the order wasn't rejected somehow
      // Round down at 8 decimal places
      const params = {
        size: coinsToSell.toFixed(8, BigNumber.ROUND_DOWN),
        price: price.toFixed(2),
        product_id: product,
        post_only: true
      }

      return gdax.sell(params)
    }

    logger.info(`Insufficient ${currency} account balance (${coinsToSell.toFixed(8)}) to sell coins @ $${price.toFixed(2)}`)
    positions[product].sell = false
  }

  async cancel (): Promise<void> {
    const orders = await gdax.getOrders({ status: 'open', product_id: product })

    for (const order of orders) {
      if (order.side === side) {
        await gdax.cancelOrder(order.id)
        logger.verbose(`${product}: Canceled ${side} order for ${order.size} @ $${order.price}`)
      }
    }
  }
}