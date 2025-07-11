# 绩效问卷管理系统

基于 React + Supabase 的现代化绩效问卷管理系统，支持问卷提交和管理后台功能。

## 🎯 功能特性

### 核心功能
- 📝 **问卷提交** - 员工填写和提交绩效问卷
- 📊 **管理后台** - 管理员查看和管理问卷数据
- 📈 **数据统计** - 实时统计图表和数据分析
- 💾 **草稿保存** - 支持保存草稿，避免数据丢失

### 技术特性
- ⚡ **现代化架构** - React 18 + Supabase
- 🎨 **美观界面** - Ant Design 组件库
- 📱 **响应式设计** - 支持移动端访问
- 🔒 **数据安全** - Supabase 行级安全策略
- ☁️ **云部署** - 支持快速云部署

## 🛠 技术栈

- **前端**: React 18 + Ant Design + ECharts
- **后端**: Supabase (PostgreSQL + API + 认证)
- **状态管理**: React Hooks
- **图表**: ECharts + echarts-for-react
- **样式**: CSS + Ant Design

## 🚀 快速开始

### 1. 环境准备

确保你的系统安装了：
- Node.js (版本 >= 16)
- npm 或 yarn

### 2. 克隆项目

```bash
git clone <项目地址>
cd perfomance-table
```

### 3. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
npm run server:install
```

### 4. 配置环境变量

#### 前端配置
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# Supabase 配置
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# 飞书OAuth配置
REACT_APP_FEISHU_APP_ID=your_feishu_app_id
REACT_APP_FEISHU_REDIRECT_URI=http://localhost:3000

# 后端API配置
REACT_APP_API_BASE_URL=http://localhost:3001/api
REACT_APP_API_SECRET_KEY=your_api_secret_key

# 管理员配置
REACT_APP_ADMIN_OPEN_IDS=ou_xxxxxxxxxxxxxxxxxxxx,ou_yyyyyyyyyyyyyyyyyyyy
```

#### 后端配置
```bash
cp server/.env.example server/.env
```

编辑 `server/.env` 文件：
```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 飞书应用配置
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret

# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# API安全配置
API_SECRET_KEY=your_api_secret_key
CORS_ORIGIN=http://localhost:3000
```

### 5. 启动应用

#### 开发环境
```bash
# 启动后端服务
npm run server:dev

# 启动前端服务（新终端）
npm start
```

#### 生产环境
```bash
# 构建前端
npm run build

# 启动后端服务
npm run server:start
```

### 6. 访问应用

- 前端应用：http://localhost:3000
- 后端API：http://localhost:3001
- 健康检查：http://localhost:3001/health

## 📊 数据库结构

### 主要表结构

```sql
-- 员工信息表
PT_employees (id, user_id, name, department, position, email)

-- 问卷模板表  
PT_survey_templates (id, name, description, questions, is_active)

-- 问卷提交记录表
PT_survey_responses (id, template_id, employee_id, performance_feedback, role_recognition, ...)

-- 系统用户表
PT_users (id, email, employee_id, role, is_active)
```

详细结构请查看 `supabase/schema.sql`

## 🎨 功能说明

### 问卷提交功能

1. **基本信息填写**
   - 飞书用户ID（自动获取并填充）
   - 姓名、部门、职位自动填充

2. **问卷内容**
   - 绩效评估与反馈
   - 角色认知与团队价值
   - 支持需求与资源
   - 下阶段标定与行动
   - 线效反馈
   - 总结

3. **提交流程**
   - 分步骤填写
   - 草稿保存功能
   - 最终确认提交

### 管理后台功能

1. **数据统计**
   - 总提交数、已提交数、草稿数
   - 完成率统计
   - 提交趋势图表
   - 部门参与分布

2. **问卷管理**
   - 问卷列表查看
   - 搜索和筛选
   - 详情查看
   - 状态管理

3. **数据筛选**
   - 按员工姓名搜索
   - 按状态筛选
   - 按时间范围筛选

## 🔒 权限控制

### 行级安全策略 (RLS)

- 用户只能查看和编辑自己的问卷
- 管理员可以查看所有问卷
- 草稿状态的问卷可以修改
- 已提交的问卷不可修改

### 用户角色

- `user`: 普通用户，只能填写问卷
- `admin`: 管理员，可以查看所有数据
- `manager`: 经理，可以查看下属数据

## 📈 数据分析

### 统计指标

- 参与率统计
- 完成率分析
- 部门参与度对比
- 提交时间趋势

### 可视化图表

- 提交趋势线性图
- 部门分布饼图
- 状态统计柱状图

## 🚢 部署指南

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

### Netlify 部署

1. 构建项目：`npm run build`
2. 将 `build` 文件夹上传到 Netlify
3. 配置环境变量

### Docker 部署

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 开发指南

### 项目结构

```
src/
├── components/          # React 组件
│   ├── SurveyForm.js   # 问卷提交组件
│   └── AdminDashboard.js # 管理后台组件
├── services/           # API 服务
│   └── surveyService.js # 问卷相关 API
├── lib/               # 工具库
│   └── supabase.js    # Supabase 客户端
├── hooks/             # 自定义 Hooks
├── utils/             # 工具函数
├── App.js             # 主应用组件
└── index.js           # 入口文件
```

### 开发规范

1. 使用函数式组件和 Hooks
2. 遵循 ESLint 代码规范
3. 组件名使用 PascalCase
4. 文件名使用 camelCase
5. 添加必要的注释

### API 接口说明

所有 API 操作通过 `SurveyService` 类统一管理：

```javascript
// 获取问卷模板
await SurveyService.getTemplate()

// 提交问卷
await SurveyService.submitSurveyResponse(id, data)

// 获取统计数据
await SurveyService.getStatistics()
```

## 🐛 常见问题

### 1. Supabase 连接失败

检查环境变量配置：
- `REACT_APP_SUPABASE_URL` 是否正确
- `REACT_APP_SUPABASE_ANON_KEY` 是否正确

### 2. 数据库权限错误

确保已执行 `schema.sql` 并启用 RLS 策略

### 3. 用户信息加载失败

系统会自动根据飞书登录用户创建员工记录，如遇问题请检查飞书认证配置

## 📝 更新日志

### v1.1.0 (2025-01-10)
- 🔄 将工号系统改为飞书用户ID系统
- 🔐 集成飞书OAuth认证
- ✨ 用户信息自动获取和填充
- 🎯 基于飞书用户ID的管理员权限控制
- 🗄️ 数据库结构优化

### v1.0.0 (2025-01-07)
- ✨ 初始版本发布
- 📝 问卷提交功能
- 📊 管理后台功能
- 📈 数据统计图表
- 🔒 基础权限控制

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 联系方式

如有问题，请通过以下方式联系：
- 邮箱：your-email@example.com
- 问题反馈：[GitHub Issues](https://github.com/your-username/perfomance-table/issues)