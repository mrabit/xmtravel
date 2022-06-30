const schedule = require('node-schedule')
const api = require('./api')

api.init()
schedule.scheduleJob('00 */20 * * * *', api.init) // 每20分钟执行一次
