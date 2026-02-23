const express = require('express')
const app = express()
// const { Sequelize, DataTypes } = require('sequelize');
const db = require('./db/mysql');
// const { initDatabase, db } = require('./utils/db');

const {
  APP_PORT = 3000,
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
  MYSQL_ADDRESS = 'mysql:3306',
  MYSQL_DATABASE = 'jushuo'
} = process.env;

const [defaultHost, defaultPort] = MYSQL_ADDRESS.split(':');

// const userRoutes = require('./routes/users');
const homeRoutes = require('./routes/home')


// start the sever
async function start() {
  await db.initDatabase({
    host: defaultHost,
    port : defaultPort,
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10, // 最大连接数
    queueLimit: 0
  })
  const pool = await db.getPool();
  // middlewears
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    req.db = pool;
    next();
  });

  // routes
  app.use('/',homeRoutes)

  // listen
  app.listen(APP_PORT,()=>console.log('server started at ：',APP_PORT))
}

start()
