const { default: axios } = require('axios')
const dayjs = require('dayjs')
const duration = require('dayjs/plugin/duration')
const schedule = require('node-schedule')
const { baseURL, cookie, deviceId } = require('./config')
require('./console')

dayjs.extend(duration)

const TRAVEL_BASE_URL = baseURL + 'xmTravel/'

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

function getUserIsolationPageData() {
  console.log()
  console.log('查询小茅运信息:')
  return httpRequest(
    baseURL + 'isolationPage/getUserIsolationPageData',
    'get',
    {
      __timestamp: +new Date()
    }
  ).then(async d => {
    // energy: 耐力值
    // xmy: 小茅运值
    let { energy, energyReward, xmy, xmTravel } = d.data
    // status: 1. 未开始 3. 已完成
    // remainChance: 今日剩余旅行次数
    // travelEndTime: 旅行结束时间
    let { status, remainChance, travelEndTime } = xmTravel
    let { value } = energyReward // 可领取申购奖励
    let endTime = travelEndTime * 1000
    console.log('当前小茅运值:', xmy)

    if (value) {
      await getUserEnergyAward()
    }

    let { currentPeriodCanConvertXmyNum } = await getExchangeRateInfo()
    console.log('本月剩余旅行奖励:', currentPeriodCanConvertXmyNum)

    if (currentPeriodCanConvertXmyNum <= 0) {
      // 当月无可领取奖励
      return Promise.reject()
    }

    // 未开始
    if (status === 1) {
      if (energy < 100) {
        console.log('耐力不足, 当前耐力值:', energy)
        return Promise.reject()
      }
    }

    // 进行中
    if (status === 2) {
      console.log('旅行暂未结束')
      console.log(
        '本次旅行结束时间: ',
        dayjs(endTime).format('YYYY-MM-DD HH:mm:ss')
      )
      console.log(
        '本次旅行剩余时间: ',
        dayjs.duration(endTime - +new Date()).format('HH 小时 mm 分钟 ss 秒')
      )
      return Promise.reject()
    }

    return {
      remainChance, // 剩余次数
      finish: status === 3
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

function getXmTravelInfo() {
  console.log()
  console.log('获取旅行信息: ')
  return httpRequest(TRAVEL_BASE_URL + 'getXmTravelInfo', 'get', {
    __timestamp: +new Date()
  }).then(d => {
    let { lastStartTravelTs, travelTotalTime, remainTravelCnt, travelStatus } =
      d.data

    let startTime = dayjs(lastStartTravelTs)
    let endTime = startTime.add(3, 'h')
    let firstTravel = !dayjs().isSame(startTime, 'day')

    if (firstTravel) {
      console.log('今日暂未开始旅行')
    }

    let finish = travelStatus === 3
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
    if (!remainTravelCnt) console.log('当日旅行次数已耗尽')
    else console.log('剩余旅行次数: ', remainTravelCnt)
    return {
      remainTravelCnt,
      finish: finish && !firstTravel // 今日已首次旅行过且当前已完成
    }
  })
}

function getUserEnergyAward() {
  console.log()
  console.log('获取申购耐力值: ')
  return httpRequest(
    baseURL + 'isolationPage/getUserEnergyAward',
    'post',
    {}
  ).then(d => {
    console.log(d)
    if (d.code === 200) {
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
  return httpRequest(TRAVEL_BASE_URL + 'getXmTravelReward', 'get', {
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
  return httpRequest(TRAVEL_BASE_URL + 'receiveReward', 'post', {}).then(d => {
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
  return httpRequest(TRAVEL_BASE_URL + 'startTravel', 'post', {}).then(d => {
    if (d.code === 2000) {
      console.log('开始旅行成功')
    } else {
      console.log('开始旅行失败', d.message || '')
      return Promise.reject()
    }
  })
}

function shareReward() {
  console.log()
  console.log('每日首次分享可领取耐力:')
  return httpRequest(TRAVEL_BASE_URL + 'shareReward', 'post', {}).then(d => {
    if (d.code === 2000) {
      console.log('分享成功')
    } else {
      console.log('分享失败', d.message || '')
      return Promise.reject()
    }
  })
}

async function init() {
  console.log('开始执行')
  let time = +dayjs().format('HH')
  if (time >= 9 && time < 20) {
    try {
      let { remainChance, finish } = await getUserIsolationPageData()
      // let { remainTravelCnt, finish } = await getXmTravelInfo()
      if (finish) {
        await getXmTravelReward()
        await receiveReward()
        await shareReward()
      }
      if (remainChance) await startTravel()
    } catch (e) {}
  } else {
    console.log()
    console.log('活动未开始')
  }

  console.log()
  console.log('脚本执行完毕')
  console.log()
}

init()
schedule.scheduleJob('00 */30 * * * *', init) // 每半小时
