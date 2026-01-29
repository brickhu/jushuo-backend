const express = require('express')
const app = express()

app.get('/', (req, res) => {
  res.send('欢迎使用微信云托管！-> '+ (process.env.ENV_NAME || "未知"))
})

const port = process.env.APP_PORT || 3000
app.listen(port, () => {
  console.log('服务启动成功，端口：', port)
})
