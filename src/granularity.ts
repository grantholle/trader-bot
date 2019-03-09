import CandleManager from './candleManager'

export default class CandleGranularity {
  public milliseconds: number
  public seconds: number
  public minutes: number
  public interval: NodeJS.Timer
  public indicators: any = {}
  public candleManager: CandleManager

  constructor (seconds: number) {
    this.seconds = seconds
    this.minutes = seconds / 60
    this.milliseconds = seconds * 1000
    this.candleManager = new CandleManager()
  }

  setIndicator (type: string, value: any): void {
    this.indicators[type] = value
  }

  getIndicator (type: string): any {
    return this.indicators[type]
  }

  clearInterval (): void {
    clearInterval(this.interval)
  }
}