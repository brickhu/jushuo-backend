const mysql = require('mysql2/promise')
const Knex = require('knex');
const SCHEMA = require('./schema')
const { syncTable } = require('./helplers')

let knexInstance = null;


/**
 * 初始化数据库：包括建库、建表及连接池配置
 * @param {Object} config - 数据库配置信息
 */
async function initDatabase(config) {
  const { host, port, user, password, database } = config;

  // 1. 环境准备：先通过原生连接确保数据库 (Schema) 存在
  // 因为 Knex 初始化时如果数据库不存在会直接报错
  try {
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4;`);
    await connection.end();
    console.log(`database "${database}" has been exist.`);
  } catch (err) {
    console.error('[DB] 无法创建数据库，请检查 MySQL 配置或权限');
    throw err;
  }

  // 2. 初始化 Knex 实例
  knexInstance = Knex({
    client: 'mysql2',
    connection: config,
    // 调试模式：开发环境下在控制台打印生成的原生 SQL
    debug: process.env.NODE_ENV !== 'production', 
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, cb) => {
        console.log('[DB] 建立了一个新的数据库连接');
        cb();
      }
    }
  });

  // 3. 自动同步表结构 (Schema Builder)
  try {
    for (const tableConfig of Object.values(SCHEMA)) {
      await syncTable(knexInstance, tableConfig);
    }
    console.log('Database synced successfully!');
  } catch (err) {
    console.error('Database sync failed:', err);
  }
  return knexInstance;
}

/**
 * 导出 getPool 方法供其他模块安全获取实例
 */
function getPool() {
  if (!knexInstance) {
    throw new Error('[DB] 请先在程序启动时调用 initDatabase()');
  }
  return knexInstance;
}


// async function initDatabase(config) {
//   const {host, port, user, password,database } = config
//   const connection = await mysql.createConnection({ host, port, user, password });
//   await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
//   await connection.end(); // close the connection
//   console.log(`database "${database}" has been exist.`);

//   if (!pool) {
//     pool = mysql.createPool(config);
//     try {
//     // 因为是 Promise 版，所以这里可以直接 await
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS tests (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         username VARCHAR(50) NOT NULL UNIQUE,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `); 
//     return pool; 
//   } catch (err) {
//     console.error("初始化失败", err);
//     throw err;
//   }
//   }
//   return pool;
// }

// function getPool() {
//   if (!pool) throw new Error('The database has not been initialized yet. Please call initDatabase first.');
//   return pool;
// }


module.exports = {initDatabase,getPool}