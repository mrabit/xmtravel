const { default: axios } = require('axios')
const dayjs = require('dayjs')
const duration = require('dayjs/plugin/duration')
const { baseURL, cookie, deviceId, bark } = require('./config')
require('./console')

dayjs.extend(duration)
let cookies = []

if (Array.isArray(cookie)) cookies = cookie
else if (cookie.indexOf('&') > -1) cookies = cookie.split('&').filter(v => v)
else if (cookie.indexOf('\n') > -1) cookies = cookie.split('\n').filter(v => v)

let currentCookie = ''

if (!cookies.length) {
  console.log('未配置cookie, 程序终止')
  process.exit(1)
}

const xmTravelAxios = axios.create()
const barkAxios = axios.create()

const TRAVEL_BASE_URL = baseURL + 'xmTravel/'

xmTravelAxios.interceptors.request.use(req => {
  req.headers['X-Requested-With'] = 'XMLHttpRequest'
  req.headers['Accept-Language'] = 'zh-cn'
  req.headers['MT-Request-ID'] = getGUID()
  req.headers[
    'User-Agent'
  ] = `Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 moutaiapp/1.2.1 device-id/${
    deviceId || 'moutaiapp'
  }`
  req.headers['Referer'] =
    'https://h5.moutai519.com.cn/gux/game/main?appConfig=2_1_2'
  req.headers['Cookie'] = currentCookie
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

function log(...msg) {
  console.log(`账号${cookies.indexOf(currentCookie) + 1}`, ...msg)
}

function sendBarkMsg(msg) {
  log(msg)
  if (!bark) return false
  return barkAxios({
    method: 'get',
    url: `${bark}/${encodeURIComponent('xmtravel')}/${encodeURIComponent(
      `账号${cookies.indexOf(currentCookie) + 1} ` + msg
    )}?group=${encodeURIComponent('xmtravel')}`
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
  return await xmTravelAxios({
    url,
    method,
    data,
    params
  })
    .then(d => d.data)
    .catch(async d => {
      if (d.response.status === 500 && d.response.data) {
        return Promise.resolve(d.response.data)
      }
      if (d.response.status === 401 && d.response.data) {
        await sendBarkMsg(`登录失效, 请更新 cookie 配置`)
        return Promise.reject('登录失效')
      }
      log(d)
    })
}

function getUserIsolationPageData() {
  console.log()
  log('查询小茅运信息:')
  let currentDate = +new Date()
  return httpRequest(
    baseURL + 'isolationPage/getUserIsolationPageData',
    'get',
    {
      __timestamp: currentDate
    }
  ).then(async d => {
    // energy: 耐力值
    // xmy: 小茅运值
    let { energy, energyReward, xmy, xmTravel } = d.data
    // status: 1. 未开始 2. 进行中 3. 已完成
    // remainChance: 今日剩余旅行次数
    // travelEndTime: 旅行结束时间
    let { status, remainChance, travelEndTime } = xmTravel
    let { value } = energyReward // 可领取申购耐力值奖励
    let endTime = travelEndTime * 1000
    log('当前小茅运值:', xmy)

    if (value) {
      await getUserEnergyAward()
      energy += value
    }

    let { currentPeriodCanConvertXmyNum } = await getExchangeRateInfo()
    log('本月剩余旅行奖励:', currentPeriodCanConvertXmyNum)

    if (currentPeriodCanConvertXmyNum <= 0) {
      // 当月无可领取奖励
      return Promise.reject()
    }

    // 未开始
    if (status === 1) {
      if (energy < 100) {
        log('耐力不足, 当前耐力值:', energy)
        return Promise.reject()
      }
    }

    // 进行中
    if (status === 2) {
      log('旅行暂未结束')
      log('本次旅行结束时间: ', dayjs(endTime).format('YYYY-MM-DD HH:mm:ss'))
      log(
        '本次旅行剩余时间: ',
        dayjs.duration(endTime - currentDate).format('HH 小时 mm 分钟 ss 秒')
      )
      return Promise.reject()
    }

    return {
      remainChance, // 剩余次数
      finish: status === 3,
      currentPeriodCanConvertXmyNum
    }
  })
}

// 获取本月剩余奖励耐力值
function getExchangeRateInfo() {
  return httpRequest(baseURL + 'synthesize/exchangeRateInfo', 'get', {
    __timestamp: +new Date()
  }).then(d => {
    let { currentPeriodCanConvertXmyNum } = d.data

    return { currentPeriodCanConvertXmyNum }
  })
}

function getUserEnergyAward() {
  console.log()
  log('获取申购耐力值: ')
  return httpRequest(
    baseURL + 'isolationPage/getUserEnergyAward',
    'post',
    {}
  ).then(d => {
    if (d.code === 200) {
      log('耐力值领取成功')
    } else {
      log('耐力值领取失败', d.message || '')
      return Promise.reject()
    }
  })
}

function getXmTravelReward() {
  console.log()
  log('查询旅行奖励: ')
  return httpRequest(TRAVEL_BASE_URL + 'getXmTravelReward', 'get', {
    __timestamp: +new Date()
  }).then(d => {
    if (d.code === 2000 && d.data.travelRewardXmy) {
      log('可获取小茅运: ', d.data.travelRewardXmy)
      return d.data.travelRewardXmy
    } else {
      log('旅行暂未完成', d.message || '')
      return Promise.reject()
    }
  })
}

function receiveReward(travelRewardXmy) {
  console.log()
  log('领取旅行奖励: ')
  return httpRequest(TRAVEL_BASE_URL + 'receiveReward', 'post', {}).then(d => {
    if (d.code === 2000) {
      sendBarkMsg('成功领取旅行奖励小茅运' + travelRewardXmy)
    } else {
      log('领取失败', d.message || '')
      return Promise.reject()
    }
  })
}

function startTravel() {
  console.log()
  log('开始旅行: ')
  return httpRequest(TRAVEL_BASE_URL + 'startTravel', 'post', {}).then(d => {
    if (d.code === 2000) {
      log('开始旅行成功')
    } else {
      log('开始旅行失败', d.message || '')
      return Promise.reject()
    }
  })
}

function shareReward() {
  console.log()
  log('每日首次分享可领取耐力:')
  return httpRequest(TRAVEL_BASE_URL + 'shareReward', 'post', {}).then(d => {
    if (d.code === 2000) {
      log('分享成功')
    } else {
      log('分享失败', d.message || '')
      return Promise.reject()
    }
  })
}

async function init() {
  console.log('开始执行')
  let time = +dayjs().format('HH')
  if (time >= 9 && time < 20) {
    for await (i of cookies) {
      currentCookie = i
      try {
        let { remainChance, finish, currentPeriodCanConvertXmyNum } =
          await getUserIsolationPageData()
        if (finish) {
          let travelRewardXmy = await getXmTravelReward()
          await receiveReward(travelRewardXmy)
          await shareReward()
          // 本次旅行奖励领取后, 当月实际剩余旅行奖励
          if (currentPeriodCanConvertXmyNum - travelRewardXmy <= 0) {
            log('当月无可领取奖励')
            return Promise.reject()
          }
        }

        if (!remainChance) log('当日旅行次数已耗尽')
        else log('当日剩余旅行次数: ', remainChance)

        if (remainChance) await startTravel()
      } catch (e) {}
    }
  } else {
    console.log()
    console.log('活动未开始')
  }

  console.log()
  console.log('脚本执行完毕')
  console.log()
}

exports.init = init
