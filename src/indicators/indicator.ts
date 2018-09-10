export default interface Indicator {
  message: string
  calculate (values: Array<number>): any
}