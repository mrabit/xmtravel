module.exports = {
  baseURL: 'https://h5.moutai519.com.cn/game/',
  cookie: process.env.MT_COOKIE || [''], // 小茅运 H5 页面请求 cookie
  deviceId: process.env.MT_DEVICEID || '', // User-Agent 里的 deviceId 值
  bark: process.env.BARK || '' // bark 推送地址
}
