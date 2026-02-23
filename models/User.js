const { db, DataTypes } = require('../utils/db');

/**
 * 用户模型定义
 */
const User = db.defineModel('User', {
  // 用户ID，主键，自增
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户ID'
  },
  // 用户名，唯一，不能为空
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: '用户名'
  },
  // 邮箱，唯一，验证格式
  email: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    },
    comment: '邮箱'
  },
  // 密码，存储加密后的哈希
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码哈希'
  },
  // 用户状态：active/inactive
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    comment: '用户状态'
  },
  // 最后登录时间
  lastLoginAt: {
    type: DataTypes.DATE,
    comment: '最后登录时间'
  }
}, {
  // 模型选项
  tableName: 'users',  // 自定义表名
  timestamps: true,    // 自动添加 createdAt 和 updatedAt
  paranoid: false,     // 不启用软删除
  indexes: [
    // 创建索引提升查询性能
    {
      name: 'idx_username',
      fields: ['username']
    },
    {
      name: 'idx_email',
      fields: ['email']
    },
    {
      name: 'idx_status',
      fields: ['status']
    }
  ],
  hooks: {
    // 模型钩子：创建前执行
    beforeCreate: (user) => {
      console.log(`即将创建用户: ${user.username}`);
    },
    // 模型钩子：创建后执行
    afterCreate: (user) => {
      console.log(`用户创建成功: ${user.username} (ID: ${user.id})`);
    }
  }
});

// 导出模型
module.exports = User;