import coinbaseWebsocket from './src/clients/coinbaseWebsocketClient'
import logger from './src/utilities/logger'
import { product, granularities, liveTrade } from './src/config'
import Bot from './src/bot'

logger.info(`Trading ${liveTrade ? 'IS' : 'IS NOT'} live`)

let reconnectAttempts = 0
const bot = new Bot(product, granularities)

coinbaseWebsocket.on('open', async () => {
  logger.info(`Socket is connected`)

  let heartbeatTimeout: NodeJS.Timer
  const heartbeatReconnectDelay = 15000

  heartbeatTimeout = setTimeout(coinbaseWebsocket.connect, heartbeatReconnectDelay)

  bot.ready.then(() => {
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
})

coinbaseWebsocket.on('close', () => {
  logger.info(`Websocket connection closed.`)

  // Stop all the intervals
  bot.clearIntervals()
})

coinbaseWebsocket.on('error', (err: Error) => {
  logger.error(`WebSocket error: ${err.message}`)

  // Attempt to reconnect after 30 seconds up to 4 times
  if (++reconnectAttempts < 5) {
    setTimeout(coinbaseWebsocket.connect, 30000)
  }
})
