import gdaxWebsocket from './src/gdaxWebsocketClient'
import init from './src/initialize'
import tickerHandler from './src/ticker'
import logger from './src/logger'
import { products, granularities, liveTrade } from './src/config'

let reconnectAttempts = 0
let priceTracker = {}

logger.info(`Trading ${liveTrade ? 'IS' : 'IS NOT'} live`)

gdaxWebsocket.on('open', async () => {
  logger.info(`Socket is connected`)
  let heartbeatTimeout
  const heartbeatReconnectDelay = 15000

  heartbeatTimeout = setTimeout(gdaxWebsocket.connect, heartbeatReconnectDelay)

  try {
    // Initialize by getting historical prices and starting intervals
    priceTracker = await init()
  } catch (err) {
    logger.error(`Failed initializing`, err)
  }

  // Only attach the listener after we've been initialized
  gdaxWebsocket.on('message', (message: any) => {
    // Listen for hearbeats, reconnect if we lose the heartbeat after 15 seconds
    if (message.type === 'heartbeat') {
      clearTimeout(heartbeatTimeout)
      heartbeatTimeout = setTimeout(gdaxWebsocket.connect, heartbeatReconnectDelay)
    }

    tickerHandler(message, priceTracker)
  })
})

gdaxWebsocket.on('close', () => {
  logger.info(`Websocket connection closed.`)

  // Stop all the intervals
  for (const product in products) {
    for (const granularity of granularities) {
      if (priceTracker[product]) {
        clearInterval(priceTracker[product][granularity].interval)
      }
    }
  }
})

gdaxWebsocket.on('error', err => {
  logger.error(`WebSocket error: ${err.message}`)

  // Attempt to reconnect after 30 seconds up to 4 times
  if (++reconnectAttempts < 5) {
    setTimeout(gdaxWebsocket.connect, 30000)
  }
})
