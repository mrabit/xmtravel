const { default: axios } = require('axios')
const dayjs = require('dayjs')
const duration = require('dayjs/plugin/duration')
const schedule = require('node-schedule')
const { baseURL, cookie, deviceId } = require('./config')
require('./console')

dayjs.extend(duration)

// axios.defaults.baseURL = baseURL
axios.interceptors.request.use(req => {
  req.headers['X-Requested-With'] = 'XMLHttpRequest'
  req.headers['Accept-Language'] = 'zh-cn'
  req.headers['MT-Request-ID'] = getGUID()
  req.headers[
    'User-Agent'
  ] = `Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 moutaiapp/1.2.1 device-id/${deviceId}`
  req.headers['Referer'] =
    'https://h5.moutai519.com.cn/gux/game/main?appConfig=2_1_2'
  req.headers['Cookie'] = cookie
  req.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01'
  req.headers['Content-Type'] = 'application/json'
  req.headers['MT-APP-Version'] = '1.0.0'
  req.headers['Origin'] = 'https://h5.moutai519.com.cn'
  return req
})

function getGUID(key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') {
  return key.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0
    var v = c == 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}

async function httpRequest(url, method = 'get', _data) {
  let params = ''
  let data = {}
  if (method === 'get') {
    params = _data
  } else {
    data = _data
  }
  return await axios({
    url,
    method,
    data,
    params
  })
    .then(d => d.data)
    .catch(d => {
      if (d.response.status === 500 && d.response.data) {
        return Promise.resolve(d.response.data)
      }
      console.log(d)
    })
}

function getXmTravelInfo() {
  console.log()
  console.log('获取旅行信息: ')
  return httpRequest(baseURL + 'getXmTravelInfo', 'get', {
    __timestamp: +new Date()
  }).then(d => {
    let { lastStartTravelTs, travelTotalTime, remainTravelCnt, travelStatus } =
      d.data

    let startTime = dayjs(lastStartTravelTs)
    let endTime = startTime.add(3, 'h')

    let finish = +new Date() - endTime.valueOf() >= 0
    if (!finish) {
      console.log('旅行暂未结束')
      console.log(
        '本次旅行开始时间: ',
        dayjs(lastStartTravelTs).format('YYYY-MM-DD HH:mm:ss')
      )
      console.log(
        '本次旅行结束时间: ',
        startTime.add(3, 'h').format('YYYY-MM-DD HH:mm:ss')
      )
      console.log(
        '本次旅行剩余时间: ',
        dayjs.duration(endTime - +new Date()).format('HH 小时 mm 分钟 ss 秒')
      )
      return Promise.reject()
    }
    if (remainTravelCnt >= travelTotalTime) {
      console.log('当日旅行次数已耗尽')
      return Promise.reject()
    }
    console.log('剩余旅行次数: ', travelTotalTime - remainTravelCnt)
  })
}

function getUserEnergyAward() {
  console.log()
  console.log('获取申购耐力值: ')
  return httpRequest(
    'https://h5.moutai519.com.cn/game/isolationPage/getUserEnergyAward',
    'post',
    {}
  ).then(d => {
    if (d.code === 2000) {
      console.log('耐力值领取成功')
    } else {
      console.log('耐力值领取失败', d.message || '')
      return Promise.reject()
    }
  })
}

function getXmTravelReward() {
  console.log()
  console.log('查询旅行奖励: ')
  return httpRequest(baseURL + 'getXmTravelReward', 'get', {
    __timestamp: +new Date()
  }).then(d => {
    if (d.code === 2000 && d.data.travelRewardXmy) {
      console.log('可获取小茅运: ', d.data.travelRewardXmy)
    } else {
      console.log('旅行暂未完成', d.message || '')
      return Promise.reject()
    }
  })
}

function receiveReward() {
  console.log()
  console.log('领取旅行奖励: ')
  return httpRequest(baseURL + 'receiveReward', 'post', {}).then(d => {
    if (d.code === 2000) {
      console.log('领取成功')
    } else {
      console.log('领取失败', d.message || '')
      return Promise.reject()
    }
  })
}

function startTravel() {
  console.log()
  console.log('开始旅行: ')
  return httpRequest(baseURL + 'startTravel', 'post', {}).then(d => {
    if (d.code === 2000) {
      console.log('开始旅行成功')
    } else {
      console.log('开始旅行失败', d.message || '')
      return Promise.reject()
    }
  })
}

async function init() {
  console.log('开始执行')
  let time = +dayjs().format('HH')
  if (time < 9) {
    console.log('活动未开始')
    return false
  }
  try {
    await getUserEnergyAward()
  } catch (e) {}
  try {
    await getXmTravelInfo()
    await getXmTravelReward()
    await receiveReward()
    await startTravel()
  } catch (e) {
    console.log()
    console.log('脚本执行完毕')
    console.log()
  }
}

init()
schedule.scheduleJob('00 00 */1 * * *', init) // 每小时
