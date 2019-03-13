import BigNumber from 'bignumber.js'
import Product from './product'
import Trade from './trade'
import { formatPrice, percentChange } from './utilities'

export default class Position {
  public live: boolean = false
  public product: Product = null
  public profitPercent: BigNumber = null
  public buy: Trade
  public sell: Trade

  constructor (product: Product, live: boolean = false) {
    this.product = product
    this.live = live

    this.buy = new Trade(product, 'buy', live)
    this.sell = new Trade(product, 'sell', live)
  }

  canBuy () {
    return !this.buy.open &&
      !this.buy.filled
  }

  canSell () {
    return !this.buy.open &&
      this.buy.filled &&
      !this.sell.open &&
      !this.sell.filled
  }

  update (message: any) {
    if (message.type === 'done') {
      this[message.side].open = false
      // Either be 'filled' or 'cancelled'
      this[message.side][message.reason] = true
    } else if (message.type === 'match') {
      this[message.side].filledSize = this[message.side].filledSize.plus(message.size)
    }
  }

  getProfit (): void {
    this.profitPercent = percentChange(this.buy.price.multipliedBy(this.buy.amount), this.sell.price.multipliedBy(this.sell.amount))

    this.product.info(`Position profit ${this.profitPercent.toFixed(2)}%: bought ${this.buy.amount} coins @ ${formatPrice(this.buy.price)}, sold @ ${formatPrice(this.sell.price)}`)
  }
}