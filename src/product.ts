import BigNumber from 'bignumber.js'
import logger from './utilities/logger'

export default class Product {
  public id: string
  public baseCurrency: string
  public quoteCurrency: string
  public baseMinSize: BigNumber
  public baseMaxSize: BigNumber
  public quoteIncrement: BigNumber

  constructor (productData: any) {
    this.id = productData.id
    this.baseCurrency = productData.base_currency
    this.quoteCurrency = productData.quote_currency
    this.baseMinSize = new BigNumber(productData.base_min_size)
    this.baseMaxSize = new BigNumber(productData.base_max_size)
    this.quoteIncrement = new BigNumber(productData.quote_increment)
  }

  debug (message: string, obj?: object) {
    logger.debug(`${this.id}: ${message}`, obj)
  }

  info (message: string, obj?: object) {
    logger.info(`${this.id}: ${message}`, obj)
  }

  silly (message: string, obj?: object) {
    logger.silly(`${this.id}: ${message}`, obj)
  }

  error (message: string, obj?: object) {
    logger.error(`${this.id}: ${message}`, obj)
  }

  verbose (message: string, obj?: object) {
    logger.verbose(`${this.id}: ${message}`, obj)
  }
}