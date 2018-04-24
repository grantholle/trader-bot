'use strict'

const PushBullet = require('pushbullet')
const logger = require('./logger')
let pusher = false

try {
  pusher = new PushBullet(process.env.PUSHBULLET_KEY)
} catch (e) { }

module.exports = {
  buy (msg) {
    if (!pusher) {
      return
    }

    pusher.note({}, 'Buy! Buy! Buy!', msg).catch(err => {
      logger.error(`Failed pushing note: ${err.message}`)
    })
  },
  sell (msg) {
    if (!pusher) {
      return
    }

    pusher.note({}, 'Sell! Sell! Sell!', msg).catch(err => {
      logger.error(`Failed pushing note: ${err.message}`)
    })
  }
}
