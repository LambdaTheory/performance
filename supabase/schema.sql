-- ================================
-- 绩效管理系统数据库结构
-- ================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 员工信息表
CREATE TABLE PT_employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL, -- 飞书用户ID
  name VARCHAR(100) NOT NULL, -- 姓名
  department VARCHAR(100), -- 部门
  position VARCHAR(100), -- 职位
  email VARCHAR(255), -- 邮箱
  manager_id UUID REFERENCES PT_employees(id), -- 直属领导
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统用户表（用于登录认证）
CREATE TABLE PT_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  employee_id UUID REFERENCES PT_employees(id),
  role VARCHAR(20) DEFAULT 'admin', -- 只保留admin角色
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_PT_employees_user_id ON PT_employees(user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_PT_employees_updated_at BEFORE UPDATE ON PT_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PT_users_updated_at BEFORE UPDATE ON PT_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入测试数据（可选）
INSERT INTO PT_employees (user_id, name, department, position, email) VALUES 
('de44f69e', 'Kun', '技术部', '前端工程师', 'kun@looplaygame.com');

-- RLS (Row Level Security) 策略
ALTER TABLE pt_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_users ENABLE ROW LEVEL SECURITY;

-- 为匿名用户创建访问策略
CREATE POLICY "Anon users can view employees" ON pt_employees
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can view users" ON pt_users
  FOR SELECT TO anon USING (true);

-- 为认证用户创建访问策略
CREATE POLICY "Auth users can view employees" ON pt_employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can view users" ON pt_users
  FOR SELECT TO authenticated USING (true);

-- 为所有角色授予必要权限
GRANT ALL ON pt_employees TO anon;
GRANT ALL ON pt_users TO anon;

GRANT ALL ON pt_employees TO authenticated;
GRANT ALL ON pt_users TO authenticated;

-- 授予序列权限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;