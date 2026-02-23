const express = require('express');
const router = express.Router();
const { db } = require('../utils/db');
const User = require('../models/User');

/**
 * 用户路由示例
 * 展示数据库封装的多种使用方式
 */

// ==================== 1. 基础查询示例 ====================

// GET /users - 获取所有用户（使用原始SQL查询）
router.get('/', async (req, res) => {
  try {
    console.log('执行原始SQL查询获取所有用户');

    // 方式1：使用原始SQL查询
    const users = await db.query('SELECT * FROM users ORDER BY id DESC LIMIT 10');

    res.json({
      success: true,
      message: '用户列表获取成功',
      data: users,
      queryType: 'raw_sql'
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

// GET /users/count - 统计用户数量（使用原始SQL）
router.get('/count', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    const count = result[0]?.count || 0;

    res.json({
      success: true,
      message: '用户数量统计成功',
      data: { count },
      queryType: 'raw_sql_with_aggregation'
    });
  } catch (error) {
    console.error('统计用户数量失败:', error);
    res.status(500).json({
      success: false,
      message: '统计用户数量失败',
      error: error.message
    });
  }
});

// ==================== 2. 模型操作示例（CRUD） ====================

// POST /users - 创建新用户（使用模型）
router.post('/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      });
    }

    console.log(`创建用户: ${username}, ${email}`);

    // 使用模型创建用户
    const user = await User.create({
      username,
      email,
      password, // 实际项目中应该加密
      status: 'active'
    });

    // 返回创建的用户（排除密码字段）
    const userData = user.toJSON();
    delete userData.password;

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: userData,
      operationType: 'model_create'
    });
  } catch (error) {
    console.error('创建用户失败:', error);

    // 处理唯一约束冲突
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已存在',
        error: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: '创建用户失败',
      error: error.message
    });
  }
});

// GET /users/:id - 获取单个用户（使用模型）
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确'
      });
    }

    console.log(`获取用户ID: ${userId}`);

    // 使用模型查找用户
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] } // 排除密码字段
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户获取成功',
      data: user,
      operationType: 'model_find_by_pk'
    });
  } catch (error) {
    console.error('获取用户失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户失败',
      error: error.message
    });
  }
});

// PUT /users/:id - 更新用户（使用模型）
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, status } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确'
      });
    }

    console.log(`更新用户ID: ${userId}`);

    // 使用模型更新用户
    const [updatedCount] = await User.update(
      { username, email, status },
      { where: { id: userId } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或无需更新'
      });
    }

    // 获取更新后的用户
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: '用户更新成功',
      data: updatedUser,
      updatedCount,
      operationType: 'model_update'
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败',
      error: error.message
    });
  }
});

// DELETE /users/:id - 删除用户（使用模型）
router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '用户ID格式不正确'
      });
    }

    console.log(`删除用户ID: ${userId}`);

    // 使用模型删除用户
    const deletedCount = await User.destroy({
      where: { id: userId }
    });

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户删除成功',
      deletedCount,
      operationType: 'model_destroy'
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: error.message
    });
  }
});

// ==================== 3. 高级查询示例 ====================

// GET /users/search/:keyword - 搜索用户（使用模型查询）
router.get('/search/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;

    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词至少2个字符'
      });
    }

    console.log(`搜索用户关键词: ${keyword}`);

    // 使用模型进行复杂查询
    const users = await User.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { username: { [db.Sequelize.Op.like]: `%${keyword}%` } },
          { email: { [db.Sequelize.Op.like]: `%${keyword}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      message: '用户搜索成功',
      data: users,
      keyword,
      operationType: 'model_complex_query'
    });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索用户失败',
      error: error.message
    });
  }
});

// GET /users/stats/summary - 用户统计摘要（混合查询）
router.get('/stats/summary', async (req, res) => {
  try {
    console.log('获取用户统计摘要');

    // 并行执行多个查询
    const [totalCountResult, activeCountResult, recentUsers] = await Promise.all([
      // 查询总用户数
      db.query('SELECT COUNT(*) as total FROM users'),

      // 查询活跃用户数
      db.query('SELECT COUNT(*) as active FROM users WHERE status = ?', ['active']),

      // 查询最近创建的用户（使用模型）
      User.findAll({
        attributes: ['id', 'username', 'email', 'createdAt'],
        where: { status: 'active' },
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);

    const total = totalCountResult[0]?.total || 0;
    const active = activeCountResult[0]?.active || 0;
    const inactive = total - active;

    res.json({
      success: true,
      message: '用户统计摘要获取成功',
      data: {
        total,
        active,
        inactive,
        recentUsers,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
      },
      operationType: 'mixed_queries_parallel'
    });
  } catch (error) {
    console.error('获取用户统计摘要失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计摘要失败',
      error: error.message
    });
  }
});

// ==================== 4. 事务示例 ====================

// POST /users/batch - 批量创建用户（使用事务确保一致性）
router.post('/batch', async (req, res) => {
  let transaction;

  try {
    const usersData = req.body.users || [];

    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户数据不能为空'
      });
    }

    console.log(`批量创建 ${usersData.length} 个用户，使用事务`);

    // 开始事务
    transaction = await db.transaction();

    const createdUsers = [];

    // 在事务中批量创建用户
    for (const userData of usersData) {
      const { username, email, password } = userData;

      if (!username || !email || !password) {
        // 事务回滚：任何失败都会回滚所有操作
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `用户数据不完整: ${username || '未知用户'}`
        });
      }

      const user = await User.create({
        username,
        email,
        password,
        status: 'active'
      }, { transaction });

      createdUsers.push({
        id: user.id,
        username: user.username,
        email: user.email
      });
    }

    // 提交事务
    await transaction.commit();

    console.log(`批量创建成功: ${createdUsers.length} 个用户`);

    res.status(201).json({
      success: true,
      message: '批量创建用户成功',
      data: createdUsers,
      operationType: 'transaction_batch_create'
    });

  } catch (error) {
    // 回滚事务（如果已开始）
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('事务已回滚');
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError);
      }
    }

    console.error('批量创建用户失败:', error);

    // 处理唯一约束冲突
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已存在',
        error: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: '批量创建用户失败',
      error: error.message
    });
  }
});

// ==================== 5. 数据库连接状态检查 ====================

// GET /users/health - 检查数据库连接状态
router.get('/health', async (req, res) => {
  try {
    console.log('检查数据库连接健康状态');

    // 检查数据库连接状态
    const isConnected = await db.ping();

    // 获取数据库配置信息（隐藏密码）
    const dbConfig = db.getConfig();

    // 获取连接池信息
    const poolInfo = dbConfig.pool || {};

    res.json({
      success: true,
      message: '数据库健康检查完成',
      data: {
        database: dbConfig.database,
        host: dbConfig.host,
        port: dbConfig.port,
        connected: isConnected,
        pool: poolInfo,
        timestamp: new Date().toISOString()
      },
      operationType: 'health_check'
    });
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    res.status(503).json({
      success: false,
      message: '数据库连接异常',
      error: error.message,
      connected: false
    });
  }
});

// ==================== 6. 示例数据初始化 ====================

// POST /users/init-sample - 初始化示例数据（演示用）
router.post('/init-sample', async (req, res) => {
  try {
    console.log('初始化示例用户数据');

    // 检查是否已有数据
    const existingCount = await User.count();

    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: '用户表已有数据，请先清空'
      });
    }

    // 示例用户数据
    const sampleUsers = [
      { username: 'alice', email: 'alice@example.com', password: 'password123' },
      { username: 'bob', email: 'bob@example.com', password: 'password123' },
      { username: 'charlie', email: 'charlie@example.com', password: 'password123' },
      { username: 'diana', email: 'diana@example.com', password: 'password123' },
      { username: 'edward', email: 'edward@example.com', password: 'password123' }
    ];

    // 批量创建示例用户
    const createdUsers = await User.bulkCreate(sampleUsers);

    const result = createdUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email
    }));

    console.log(`示例数据初始化成功: ${result.length} 个用户`);

    res.status(201).json({
      success: true,
      message: '示例数据初始化成功',
      data: result,
      operationType: 'sample_data_init'
    });
  } catch (error) {
    console.error('示例数据初始化失败:', error);
    res.status(500).json({
      success: false,
      message: '示例数据初始化失败',
      error: error.message
    });
  }
});

// 导出路由
module.exports = router;