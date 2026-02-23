// db/schema.js

const SCHEMA = {
  TESTS: {
    name: 'tests',
    fields: {
      ID: { name: 'id', type: 'increments', primary: true },
      USERNAME: { name: 'username', type: 'string' },
      CREATED_AT: { name: 'created_at', type: 'timestamp', default: 'now' }
    }
  }
  // USERS: {
  //   name: 'users',
  //   fields: {
  //     ID: { name: 'id', type: 'increments', primary: true },
  //     EMAIL: { name: 'email', type: 'string', unique: true, nullable: false },
  //     AGE: { name: 'age', type: 'integer', nullable: true },
  //     BIO: { name: 'bio', type: 'text', nullable: true },
  //     CREATED_AT: { name: 'created_at', type: 'timestamp', default: 'now' }
  //   }
  // },
  // POSTS: {
  //   name: 'posts',
  //   fields: {
  //     ID: { name: 'id', type: 'increments', primary: true },
  //     TITLE: { name: 'title', type: 'string', length: 255 },
  //     AUTHOR_ID: { name: 'author_id', type: 'integer', foreign: 'users.id' }
  //   }
  // }
};

// 深度冻结防止修改（可选）
Object.freeze(SCHEMA);

module.exports = SCHEMA;