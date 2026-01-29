const express = require('express')
const app = express()

const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

app.get('/', (req, res) => {
  res.send('欢迎使用微信云托管！-> '+ (MYSQL_ADDRESS || "没有"))
})

const port = process.env.APP_PORT || 3000
app.listen(port, () => {
  console.log('服务启动成功，端口：', port)
})
