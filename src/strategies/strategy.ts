import Product from '../product'

export default interface Strategy {
  analyze (product: Product, indicatorData: any, message: any): any
}