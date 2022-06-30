## i 茅台 APP 小茅运活动

> nodejs 实现小茅运旅行活动自动执行

### TODO

- [x] 自动旅行
- [x] 每日首次旅行分享
- [x] 领取申购耐力值

### 安装

```shell
npm i -g pm2
git clone git@github.com:mrabit/xmtravel.git
cd xmtravel
npm install
```

### 启动

```shell
cp config.example.js config.js
# 脚本启动
pm2 start script.json
# 日志查看
pm2 logs xmtravel --out --lines=100
```

![xmtravel_log.png](./assets/xmtravel_log.png)

### 申明

- 本项目仅做学习交流, 禁止用于各种非法途径
- 项目中的所有内容均源于互联网, 仅限于小范围内学习参考, 如有侵权请第一时间联系 [本项目作者](https://github.com/mrabit) 进行删除

### 注意

[关于使用 Actions 的注意事项](https://www.v2ex.com/t/817831), 建议在本地部署启动
