// db/sync.js
async function syncTable(knex, tableConfig) {
  const tableName = tableConfig.name;
  const hasTable = await knex.schema.hasTable(tableName);

  if (!hasTable) {
    console.log(`[DB] Creating table: ${tableName}`);
    await knex.schema.createTable(tableName, (table) => {
      buildColumns(table, tableConfig.fields, knex);
    });
  } else {
    console.log(`[DB] Syncing columns for table: ${tableName}`);
    const existingColumns = await knex(tableName).columnInfo();
    
    await knex.schema.alterTable(tableName, (table) => {
      for (const [key, col] of Object.entries(tableConfig.fields)) {
        // 如果数据库里没有这个字段名，则添加
        if (!existingColumns[col.name || key]) {
          console.log(`[DB] Adding missing column: ${col.name || key}`);
          addColumn(table, col.name || key, col, knex);
        }
      }
    });
  }
}

// 辅助函数：根据配置添加单个列
function addColumn(table, name, config, knex) {
  let column;
  switch (config.type) {
    case 'increments': column = table.increments(name); break;
    case 'string': column = table.string(name, config.length || 255); break;
    case 'integer': column = table.integer(name); break;
    case 'text': column = table.text(name); break;
    case 'timestamp': column = table.timestamp(name); break;
    default: column = table.specificType(name, config.type);
  }

  if (config.primary) column.primary();
  if (config.unique) column.unique();
  if (config.nullable === false) column.notNullable();
  if (config.default === 'now') column.defaultTo(knex.fn.now());
  return column;
}

// 辅助函数：批量构建
function buildColumns(table, columns, knex) {
  for (const [key, col] of Object.entries(columns)) {
    addColumn(table, col.name || key, col, knex);
  }
}

module.exports = { syncTable };