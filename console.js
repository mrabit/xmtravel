const dayjs = require('dayjs')
const colors = require('colors')

console.log = (function (oriLogFunc) {
  return function (...args) {
    args.unshift(
      colors.green(`[${dayjs(new Date()).format('YY-MM-DD HH:mm:ss')}]`)
    )
    oriLogFunc.apply(console, args)
  }
})(console.log)
