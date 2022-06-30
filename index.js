const schedule = require('node-schedule')
const api = require('./api')
api.init()
schedule.scheduleJob('00 */30 * * * *', api.init) // 每半小时
