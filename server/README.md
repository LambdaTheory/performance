# Performance Survey Backend API

员工绩效调查系统后端API服务

## 功能特性

- **员工数据同步**: 从飞书API同步员工信息到本地数据库
- **RESTful API**: 提供完整的员工管理API端点
- **安全认证**: API密钥验证和CORS配置
- **定时任务**: 自动同步员工数据
- **日志记录**: 完整的操作日志和错误追踪
- **健康检查**: 服务状态监控
- **数据库管理**: 自动初始化数据库表结构

## 技术栈

- **Node.js + Express**: 服务器框架
- **Supabase**: 数据库服务
- **Winston**: 日志记录
- **Axios**: HTTP客户端
- **Joi**: 数据验证
- **node-cron**: 定时任务
- **Express Rate Limit**: 请求限流

## 项目结构

```
server/
├── index.js                 # 服务器入口文件
├── routes/
│   └── employees.js         # 员工相关API路由
├── services/
│   └── employeeSync.js      # 员工同步服务
├── utils/
│   ├── logger.js           # 日志工具
│   ├── middleware.js       # 中间件工具
│   ├── database.js         # 数据库工具
│   └── scheduler.js        # 定时任务调度
├── scripts/
│   └── sync-employees.js   # 独立同步脚本
├── logs/                   # 日志文件目录
├── package.json
└── .env.example           # 环境变量示例
```

## 安装与配置

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：

```env
# 飞书应用配置
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret

# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 服务器配置
PORT=3001
NODE_ENV=development

# API 安全配置
API_SECRET_KEY=your_api_secret_key

# CORS 配置
CORS_ORIGIN=http://localhost:3000

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 同步配置
SYNC_CRON_SCHEDULE=0 2 * * *
AUTO_SYNC_ENABLED=true
```

### 3. 数据库初始化

服务启动时会自动创建必要的数据库表结构。如果自动创建失败，请手动在 Supabase SQL 编辑器中执行表结构创建脚本。

## 启动服务

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm start
```

### 独立同步脚本

```bash
npm run sync:employees
```

## API 端点

### 基础端点

- `GET /health` - 健康检查
- `GET /api/employees` - 获取员工列表
- `GET /api/employees/:id` - 获取单个员工详情
- `GET /api/employees/stats` - 获取员工统计信息

### 同步端点

- `POST /api/employees/sync` - 触发员工同步
- `GET /api/employees/sync/status` - 获取同步状态
- `GET /api/employees/sync/permissions` - 验证飞书API权限

### 请求示例

#### 获取员工列表

```bash
curl -X GET "http://localhost:3001/api/employees?page=1&limit=10" \
  -H "X-API-Key: your_api_key"
```

#### 触发员工同步

```bash
curl -X POST "http://localhost:3001/api/employees/sync" \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json"
```

## 日志记录

日志文件位于 `logs/` 目录：

- `app.log` - 应用日志
- `error.log` - 错误日志

日志级别：
- `error` - 错误信息
- `warn` - 警告信息
- `info` - 一般信息
- `debug` - 调试信息

## 定时任务

默认配置为每日凌晨2点自动同步员工数据：

```env
SYNC_CRON_SCHEDULE=0 2 * * *
```

可以通过修改环境变量来自定义同步时间。

## 错误处理

服务包含完整的错误处理机制：

- 统一的错误响应格式
- 详细的错误日志记录
- 优雅的服务关闭
- 请求超时处理

## 安全特性

- API密钥验证
- 请求频率限制
- CORS跨域配置
- 输入数据验证
- 敏感信息过滤

## 监控与维护

### 健康检查

```bash
curl http://localhost:3001/health
```

### 查看日志

```bash
tail -f logs/app.log
```

### 手动同步

```bash
node scripts/sync-employees.js --verbose
```

## 故障排除

### 1. 数据库连接失败

检查 Supabase 配置：
- 确认 `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY` 正确
- 检查网络连接
- 验证服务密钥权限

### 2. 飞书API调用失败

检查飞书应用配置：
- 确认 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 正确
- 检查应用权限设置
- 验证API调用频率限制

### 3. 端口占用

修改端口配置：
```env
PORT=3002
```

### 4. 日志文件权限

确保日志目录可写：
```bash
mkdir -p logs
chmod 755 logs
```

## 许可证

MIT License