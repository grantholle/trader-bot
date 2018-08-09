import BigNumber from 'bignumber.js'
import logger from './utilities/logger'
import Granularity from './granularity'

export default class Product {
  public id: string
  public baseCurrency: string
  public quoteCurrency: string
  public baseMinSize: BigNumber
  public baseMaxSize: BigNumber
  public quoteIncrement: BigNumber
  public granularities: Array<Granularity>

  constructor (productData: any, granularities: Array<number>) {
    this.id = productData.id
    this.baseCurrency = productData.base_currency
    this.quoteCurrency = productData.quote_currency
    this.baseMinSize = new BigNumber(productData.base_min_size)
    this.baseMaxSize = new BigNumber(productData.base_max_size)
    this.quoteIncrement = new BigNumber(productData.quote_increment)

    for (const granularity of granularities) {
      this.granularities.push(new Granularity(granularity))
    }
  }

  debug (message: string, obj?: any) {
    logger.debug(`${this.id}: ${message}`, obj)
  }

  info (message: string, obj?: any) {
    logger.info(`${this.id}: ${message}`, obj)
  }

  silly (message: string, obj?: any) {
    logger.silly(`${this.id}: ${message}`, obj)
  }

  error (message: string, obj?: any) {
    logger.error(`${this.id}: ${message}`, obj)
  }

  verbose (message: string, obj?: any) {
    logger.verbose(`${this.id}: ${message}`, obj)
  }
}