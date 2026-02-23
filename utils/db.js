const mysql = require('mysql2/promise');
const { Sequelize, DataTypes } = require('sequelize');

/**
 * MySQL 数据库封装类
 * 提供数据库初始化、连接管理、查询执行等常用方法
 */
class MySQLDatabase {
  /**
   * 构造函数
   * @param {Object} config - 数据库配置
   * @param {string} config.host - 数据库主机
   * @param {number} config.port - 数据库端口
   * @param {string} config.username - 数据库用户名
   * @param {string} config.password - 数据库密码
   * @param {string} config.database - 数据库名称
   * @param {Object} options - 额外选项
   */
  constructor(config = {}, options = {}) {
    // 从环境变量获取配置，允许构造函数覆盖
    const {
      MYSQL_USERNAME,
      MYSQL_PASSWORD,
      MYSQL_ADDRESS = 'mysql:3306',
      MYSQL_DATABASE = 'jushuo'
    } = process.env;

    const [defaultHost, defaultPort] = MYSQL_ADDRESS.split(':');

    this.config = {
      host: config.host || defaultHost,
      port: config.port || parseInt(defaultPort) || 3306,
      username: config.username || MYSQL_USERNAME || 'root',
      password: config.password || MYSQL_PASSWORD || '',
      database: config.database || MYSQL_DATABASE,
      dialect: 'mysql',
      logging: options.logging || false,
      pool: {
        max: options.pool?.max || 10,
        min: options.pool?.min || 0,
        acquire: options.pool?.acquire || 30000,
        idle: options.pool?.idle || 10000
      },
      ...options
    };

    this.sequelize = null;
    this.rawConnection = null;
    this.models = {};
    this.pendingModels = []; // 存储延迟定义的模型
    this.isInitialized = false;
    this.isConnected = false;
  }

  /**
   * 初始化数据库（创建数据库如果不存在）
   * @returns {Promise<boolean>} 是否初始化成功
   */
  async initialize() {
    try {
      console.log(`正在初始化数据库: ${this.config.database}`);

      // 1. 连接到 MySQL 服务器（无数据库）
      this.rawConnection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password
      });

      // 2. 创建数据库（如果不存在）
      await this.rawConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      await this.rawConnection.end();
      this.isInitialized = true;
      console.log(`数据库 ${this.config.database} 初始化完成`);

      return true;
    } catch (error) {
      console.error('数据库初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 建立数据库连接
   * @returns {Promise<Sequelize>} Sequelize 实例
   */
  async connect() {
    if (this.isConnected && this.sequelize) {
      return this.sequelize;
    }

    try {
      console.log(`正在连接到数据库: ${this.config.database}`);

      this.sequelize = new Sequelize(
        this.config.database,
        this.config.username,
        this.config.password,
        {
          host: this.config.host,
          port: this.config.port,
          dialect: this.config.dialect,
          logging: this.config.logging,
          dialectOptions: this.config.dialectOptions || { ssl: false },
          pool: this.config.pool,
          define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            timestamps: true,
            paranoid: false // 软删除，设置为 true 时添加 deletedAt 字段
          }
        }
      );

      // 测试连接
      await this.sequelize.authenticate();
      this.isConnected = true;
      // 连接成功，日志在 initDatabase 中统一输出

      // 定义所有暂存的模型
      console.log(`正在定义 ${this.pendingModels.length} 个暂存模型...`);
      for (const pendingModel of this.pendingModels) {
        console.log(`定义模型: ${pendingModel.name}`);
        const model = this.sequelize.define(pendingModel.name, pendingModel.attributes, {
          tableName: pendingModel.options.tableName || pendingModel.name.toLowerCase(),
          timestamps: pendingModel.options.timestamps !== undefined ? pendingModel.options.timestamps : true,
          paranoid: pendingModel.options.paranoid || false,
          ...pendingModel.options
        });
        this.models[pendingModel.name] = model;
        console.log(`模型 ${pendingModel.name} 定义完成，存储到 this.models`);
      }
      // 清空暂存列表
      this.pendingModels = [];
      console.log(`暂存模型定义完成，当前模型数量: ${Object.keys(this.models).length}`);

      return this.sequelize;
    } catch (error) {
      console.error('数据库连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取原始 MySQL 连接（用于执行原始 SQL）
   * @returns {Promise<mysql.Connection>} MySQL 连接
   */
  async getRawConnection() {
    if (!this.rawConnection) {
      this.rawConnection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database
      });
    }
    return this.rawConnection;
  }

  /**
   * 执行原始 SQL 查询
   * @param {string} sql - SQL 语句
   * @param {Array} params - 查询参数
   * @returns {Promise<any>} 查询结果
   */
  async query(sql, params = []) {
    try {
      const connection = await this.getRawConnection();
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      console.error('SQL 查询失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行事务
   * @param {Function} callback - 事务回调函数，接收 Sequelize 实例
   * @returns {Promise<any>} 事务结果
   */
  async transaction(callback) {
    if (!this.sequelize) {
      await this.connect();
    }

    return await this.sequelize.transaction(callback);
  }

  /**
   * 检查数据库连接状态
   * @returns {Promise<boolean>} 是否连接正常
   */
  async ping() {
    try {
      const connection = await this.getRawConnection();
      await connection.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 关闭数据库连接
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.rawConnection) {
        await this.rawConnection.end();
        this.rawConnection = null;
      }

      if (this.sequelize) {
        await this.sequelize.close();
        this.sequelize = null;
      }

      this.isConnected = false;
      console.log('数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接失败:', error.message);
    }
  }

  /**
   * 定义模型
   * @param {string} name - 模型名称
   * @param {Object} attributes - 模型属性定义
   * @param {Object} options - 模型选项
   * @returns {Sequelize.Model} 定义的模型
   */
  defineModel(name, attributes, options = {}) {
    // 如果 sequelize 实例已经存在，直接定义模型
    if (this.sequelize) {
      const model = this.sequelize.define(name, attributes, {
        tableName: options.tableName || name.toLowerCase(),
        timestamps: options.timestamps !== undefined ? options.timestamps : true,
        paranoid: options.paranoid || false,
        ...options
      });

      this.models[name] = model;
      return model;
    }

    // 如果 sequelize 实例不存在，将模型定义暂存起来
    // 等到 connect() 被调用时再实际定义
    const pendingModel = {
      name,
      attributes,
      options
    };

    this.pendingModels.push(pendingModel);

    // 返回一个代理对象，当实际访问模型属性时再抛出提示
    const self = this; // 捕获数据库实例的引用
    const modelName = name;
    const modelOptions = options;

    return new Proxy({}, {
      get: (target, prop) => {
        // 允许访问一些基本属性
        if (prop === 'name') return modelName;
        if (prop === 'tableName') return modelOptions.tableName || modelName.toLowerCase();

        // 如果模型已经定义（连接建立后），返回实际模型的属性
        if (self.models[modelName]) {
          const model = self.models[modelName];
          if (prop in model) {
            const value = model[prop];
            // 如果值是函数，确保正确绑定 this 上下文
            if (typeof value === 'function') {
              return value.bind(model);
            }
            return value;
          }
        }

        throw new Error(`模型 "${modelName}" 尚未初始化，请确保数据库连接已建立`);
      }
    });
  }

  /**
   * 同步所有模型到数据库
   * @param {Object} options - 同步选项
   * @returns {Promise<void>}
   */
  async syncModels(options = {}) {
    if (!this.sequelize) {
      await this.connect();
    }

    const syncOptions = {
      force: options.force || false,  // 危险：会删除现有表
      alter: options.alter || true,   // 安全：修改表结构以适应模型
      ...options
    };

    console.log(`正在同步数据库模型 (force: ${syncOptions.force}, alter: ${syncOptions.alter})`);
    await this.sequelize.sync(syncOptions);
    console.log('数据库模型同步完成');
  }

  /**
   * 获取数据库配置信息
   * @returns {Object} 配置对象（隐藏密码）
   */
  getConfig() {
    const config = { ...this.config };
    if (config.password) {
      config.password = '***';
    }
    return config;
  }
}

// 导出默认实例（使用环境变量配置）
const db = new MySQLDatabase();

/**
 * 初始化数据库连接
 * 应用启动时调用，确保数据库连接就绪
 * @returns {Promise<Sequelize>} Sequelize 实例
 */
async function initDatabase() {
  try {
    // 初始化数据库（如果不存在则创建）
    await db.initialize();
    // 建立连接
    const sequelize = await db.connect();
    console.log('✅ 数据库初始化并连接成功！');
    console.log(`数据库: ${db.config.database}`);
    console.log(`主机: ${db.config.host}:${db.config.port}`);
    return sequelize;
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    throw error;
  }
}

// 也导出类本身，方便创建多个实例
module.exports = {
  MySQLDatabase,
  db,
  DataTypes,
  initDatabase
};