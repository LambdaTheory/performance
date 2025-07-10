-- ================================
-- 绩效问卷系统数据库结构
-- ================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 员工信息表
CREATE TABLE PT_employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL, -- 工号
  name VARCHAR(100) NOT NULL, -- 姓名
  department VARCHAR(100), -- 部门
  position VARCHAR(100), -- 职位
  email VARCHAR(255), -- 邮箱
  manager_id UUID REFERENCES PT_employees(id), -- 直属领导
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 问卷模板表
CREATE TABLE PT_survey_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL, -- 模板名称
  description TEXT, -- 描述
  questions JSONB NOT NULL, -- 问题配置
  is_active BOOLEAN DEFAULT true, -- 是否启用
  created_by UUID REFERENCES PT_employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 问卷提交记录表
CREATE TABLE PT_survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES PT_survey_templates(id),
  employee_id UUID REFERENCES PT_employees(id),
  employee_name VARCHAR(100) NOT NULL, -- 冗余字段，方便查询
  employee_number VARCHAR(50), -- 工号
  
  -- 问卷内容字段
  performance_feedback TEXT, -- 绩效评估与反馈
  role_recognition TEXT, -- 角色认知与团队价值
  support_needs TEXT, -- 支持需求与资源
  next_phase_plan TEXT, -- 下阶段标定与行动
  efficiency_feedback TEXT, -- 线效反馈
  summary TEXT, -- 总结
  
  -- 状态和时间
  status VARCHAR(20) DEFAULT 'draft', -- draft, submitted, reviewed
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES PT_employees(id),
  review_notes TEXT, -- 审核备注
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统用户表（用于登录认证）
CREATE TABLE PT_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  employee_id UUID REFERENCES PT_employees(id),
  role VARCHAR(20) DEFAULT 'user', -- user, admin, manager
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_PT_survey_responses_employee_id ON PT_survey_responses(employee_id);
CREATE INDEX idx_PT_survey_responses_status ON PT_survey_responses(status);
CREATE INDEX idx_PT_survey_responses_submitted_at ON PT_survey_responses(submitted_at);
CREATE INDEX idx_PT_employees_employee_id ON PT_employees(employee_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_PT_employees_updated_at BEFORE UPDATE ON PT_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PT_survey_templates_updated_at BEFORE UPDATE ON PT_survey_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PT_survey_responses_updated_at BEFORE UPDATE ON PT_survey_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_PT_users_updated_at BEFORE UPDATE ON PT_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认问卷模板
INSERT INTO PT_survey_templates (name, description, questions) VALUES (
  '绩效问卷模板',
  '员工绩效评估问卷',
  '{
    "sections": [
      {
        "title": "绩效评估与反馈",
        "description": "对当前工作表现的自我评估",
        "field": "performance_feedback",
        "type": "textarea",
        "required": true
      },
      {
        "title": "角色认知与团队价值",
        "description": "对角色定位和团队贡献的认知",
        "field": "role_recognition", 
        "type": "textarea",
        "required": true
      },
      {
        "title": "支持需求与资源",
        "description": "工作中需要的支持和资源",
        "field": "support_needs",
        "type": "textarea",
        "required": true
      },
      {
        "title": "下阶段标定与行动",
        "description": "下一阶段的目标和行动计划",
        "field": "next_phase_plan",
        "type": "textarea", 
        "required": true
      },
      {
        "title": "线效反馈",
        "description": "对工作效率的反馈",
        "field": "efficiency_feedback",
        "type": "textarea",
        "required": false
      },
      {
        "title": "总结",
        "description": "整体总结和其他想法",
        "field": "summary",
        "type": "textarea",
        "required": false
      }
    ]
  }'::jsonb
);

-- 插入测试数据（可选）
INSERT INTO PT_employees (employee_id, name, department, position, email) VALUES 
('EMP001', '张三', '技术部', '前端工程师', 'zhangsan@company.com'),
('EMP002', '李四', '技术部', '后端工程师', 'lisi@company.com'),
('EMP003', '王五', '产品部', '产品经理', 'wangwu@company.com'),
('ADMIN', '管理员', '人事部', '系统管理员', 'admin@company.com');

-- RLS (Row Level Security) 策略
ALTER TABLE pt_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_users ENABLE ROW LEVEL SECURITY;

-- 为匿名用户创建访问策略（用于内部问卷系统）
CREATE POLICY "Anon users can view employees" ON pt_employees
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can view templates" ON pt_survey_templates
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Anon users can view responses" ON pt_survey_responses
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can create responses" ON pt_survey_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update responses" ON pt_survey_responses
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon users can view users" ON pt_users
  FOR SELECT TO anon USING (true);

-- 为认证用户创建访问策略
CREATE POLICY "Auth users can view employees" ON pt_employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can view templates" ON pt_survey_templates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Auth users can view responses" ON pt_survey_responses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can create responses" ON pt_survey_responses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can update responses" ON pt_survey_responses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth users can view users" ON pt_users
  FOR SELECT TO authenticated USING (true);

-- 为所有角色授予必要权限
GRANT ALL ON pt_employees TO anon;
GRANT ALL ON pt_survey_responses TO anon;
GRANT ALL ON pt_survey_templates TO anon;
GRANT ALL ON pt_users TO anon;

GRANT ALL ON pt_employees TO authenticated;
GRANT ALL ON pt_survey_responses TO authenticated;
GRANT ALL ON pt_survey_templates TO authenticated;
GRANT ALL ON pt_users TO authenticated;

-- 授予序列权限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;