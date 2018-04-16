'use strict'

const PushBullet = require('pushbullet')
let pusher = false

try {
  pusher = new PushBullet(process.env.PUSHBULLET_KEY)
} catch (e) { }

module.exports = {
  buy (msg) {
    if (!pusher) {
      return
    }

    pusher.note({}, 'Buy! Buy! Buy!', msg)
  },
  sell (msg) {
    if (!pusher) {
      return
    }

    pusher.note({}, 'Sell! Sell! Sell!', msg)
  }
}
