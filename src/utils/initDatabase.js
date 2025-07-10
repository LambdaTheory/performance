/**
 * 数据库初始化工具
 * 确保所需的表结构存在
 */

import { supabase, TABLES } from '../lib/supabase';

// 员工表结构
const EMPLOYEES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${TABLES.EMPLOYEES} (
    id BIGSERIAL PRIMARY KEY,
    feishu_user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    department_ids JSONB DEFAULT '[]'::jsonb,
    job_title TEXT DEFAULT '',
    status JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_sync_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_employees_feishu_user_id ON ${TABLES.EMPLOYEES}(feishu_user_id);
  CREATE INDEX IF NOT EXISTS idx_employees_is_active ON ${TABLES.EMPLOYEES}(is_active);
  CREATE INDEX IF NOT EXISTS idx_employees_last_sync_time ON ${TABLES.EMPLOYEES}(last_sync_time);

  -- 创建更新时间触发器
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  DROP TRIGGER IF EXISTS update_employees_updated_at ON ${TABLES.EMPLOYEES};
  CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON ${TABLES.EMPLOYEES}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * 初始化员工表
 */
export async function initEmployeesTable() {
  try {
    // 执行SQL创建表
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: EMPLOYEES_TABLE_SQL 
    });
    
    if (error) {
      // 如果RPC不可用，尝试直接创建基础表结构
      console.warn('RPC方法不可用，尝试使用基础API创建表');
      
      // 检查表是否存在
      const { data, error: selectError } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('id')
        .limit(1);
      
      if (selectError && selectError.code === 'PGRST116') {
        // 表不存在，需要手动创建
        throw new Error('员工表不存在，请在Supabase管理后台手动创建表结构');
      }
      
      if (selectError) {
        throw selectError;
      }
      
      console.log('员工表已存在');
      return { success: true, message: '员工表已存在' };
    }
    
    console.log('员工表初始化成功');
    return { success: true, message: '员工表初始化成功' };
    
  } catch (error) {
    console.error('初始化员工表失败:', error);
    return { 
      success: false, 
      message: `初始化员工表失败: ${error.message}`,
      sqlScript: EMPLOYEES_TABLE_SQL
    };
  }
}

/**
 * 检查表是否存在
 */
export async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取员工表的创建SQL（用于手动创建）
 */
export function getEmployeesTableSQL() {
  return EMPLOYEES_TABLE_SQL;
}

export default {
  initEmployeesTable,
  checkTableExists,
  getEmployeesTableSQL
};