import coinbaseWebsocket from './src/clients/coinbaseWebsocketClient'
import logger from './src/utilities/logger'
import { products, granularities, liveTrade } from './src/config'
import Bot from './src/bot'

let reconnectAttempts = 0
let bot = new Bot()

logger.info(`Trading ${liveTrade ? 'IS' : 'IS NOT'} live`)

coinbaseWebsocket.on('open', async () => {
  logger.info(`Socket is connected`)

  let heartbeatTimeout
  const heartbeatReconnectDelay = 15000

  await bot.getProductData(products)

  heartbeatTimeout = setTimeout(coinbaseWebsocket.connect, heartbeatReconnectDelay)

  // Only attach the listener after we've been initialized
  coinbaseWebsocket.on('message', (message: any) => {
    // Listen for hearbeats, reconnect if we lose the heartbeat after 15 seconds
    if (message.type === 'heartbeat') {
      clearTimeout(heartbeatTimeout)
      heartbeatTimeout = setTimeout(coinbaseWebsocket.connect, heartbeatReconnectDelay)
    }

    bot.handleTick(message)
  })
})

coinbaseWebsocket.on('close', () => {
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

coinbaseWebsocket.on('error', err => {
  logger.error(`WebSocket error: ${err.message}`)

  // Attempt to reconnect after 30 seconds up to 4 times
  if (++reconnectAttempts < 5) {
    setTimeout(coinbaseWebsocket.connect, 30000)
  }
})
