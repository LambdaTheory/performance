# 环境配置指南

本文档详细说明如何配置绩效问卷管理系统的环境变量和部署配置。

## 目录
1. [环境变量概览](#环境变量概览)
2. [开发环境配置](#开发环境配置)
3. [生产环境配置](#生产环境配置)
4. [配置验证](#配置验证)
5. [安全配置](#安全配置)

## 环境变量概览

### 必需的环境变量

| 变量名 | 用途 | 示例值 | 必需 |
|--------|------|--------|------|
| `REACT_APP_SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` | ✅ |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase匿名密钥 | `eyJhbGciOiJIUzI1...` | ✅ |
| `REACT_APP_FEISHU_APP_ID` | 飞书应用ID | `cli_a1b2c3d4e5f6g7h8` | ✅ |
| `REACT_APP_FEISHU_APP_SECRET` | 飞书应用密钥 | `secretkey123456` | ✅ |
| `REACT_APP_FEISHU_REDIRECT_URI` | OAuth重定向URI | `http://localhost:3000` | ✅ |

### 可选的环境变量

| 变量名 | 用途 | 示例值 | 默认值 |
|--------|------|--------|--------|
| `REACT_APP_ADMIN_EMAILS` | 管理员邮箱列表 | `admin@company.com,hr@company.com` | 空 |
| `REACT_APP_APP_NAME` | 应用名称 | `绩效问卷管理系统` | `绩效问卷管理系统` |
| `REACT_APP_VERSION` | 应用版本 | `1.0.0` | `1.0.0` |
| `PORT` | 开发服务器端口 | `3000` | `3000` |
| `GENERATE_SOURCEMAP` | 是否生成源映射 | `false` | `true` |

## 开发环境配置

### 1. 创建开发环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

### 2. 编辑开发环境配置

编辑 `.env` 文件：

```env
# Supabase配置
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# 飞书OAuth配置
REACT_APP_FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxx
REACT_APP_FEISHU_APP_SECRET=your_development_secret
REACT_APP_FEISHU_REDIRECT_URI=http://localhost:3000

# 管理员配置
REACT_APP_ADMIN_EMAILS=admin@yourcompany.com,manager@yourcompany.com

# 应用配置
REACT_APP_APP_NAME=绩效问卷管理系统
REACT_APP_VERSION=1.0.0

# 开发配置
PORT=3000
GENERATE_SOURCEMAP=false
```

### 3. 验证开发环境

启动开发服务器验证配置：

```bash
npm start
```

## 生产环境配置

### 1. 环境变量设置方法

#### 方法一：使用 .env.production 文件

创建 `.env.production` 文件：

```env
# 生产环境配置
REACT_APP_SUPABASE_URL=https://your-production-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_production_supabase_key
REACT_APP_FEISHU_APP_ID=cli_production_app_id
REACT_APP_FEISHU_APP_SECRET=your_production_secret
REACT_APP_FEISHU_REDIRECT_URI=https://your-domain.com
REACT_APP_ADMIN_EMAILS=admin@yourcompany.com
GENERATE_SOURCEMAP=false
```

#### 方法二：系统环境变量

在服务器上设置环境变量：

```bash
export REACT_APP_SUPABASE_URL="https://your-production-project.supabase.co"
export REACT_APP_SUPABASE_ANON_KEY="your_production_supabase_key"
export REACT_APP_FEISHU_APP_ID="cli_production_app_id"
export REACT_APP_FEISHU_APP_SECRET="your_production_secret"
export REACT_APP_FEISHU_REDIRECT_URI="https://your-domain.com"
export REACT_APP_ADMIN_EMAILS="admin@yourcompany.com"
```

#### 方法三：CI/CD平台配置

**GitHub Actions 示例**:
```yaml
env:
  REACT_APP_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  REACT_APP_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  REACT_APP_FEISHU_APP_ID: ${{ secrets.FEISHU_APP_ID }}
  REACT_APP_FEISHU_APP_SECRET: ${{ secrets.FEISHU_APP_SECRET }}
  REACT_APP_FEISHU_REDIRECT_URI: ${{ secrets.FEISHU_REDIRECT_URI }}
```

**Vercel 示例**:
在Vercel控制台的"Settings" > "Environment Variables"中添加配置。

**Netlify 示例**:
在Netlify控制台的"Site settings" > "Environment variables"中添加配置。

### 2. 构建生产版本

```bash
# 使用生产环境配置构建
npm run build
```

## 配置验证

### 1. 自动配置验证

应用启动时会自动验证关键配置。可以在浏览器控制台查看验证结果：

```javascript
// 在浏览器控制台运行
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Feishu App ID:', process.env.REACT_APP_FEISHU_APP_ID);
```

### 2. 手动验证清单

开发环境验证：
- [ ] 应用能正常启动（`npm start`）
- [ ] Supabase连接正常
- [ ] 飞书登录按钮显示
- [ ] 点击登录能跳转到飞书授权页面

生产环境验证：
- [ ] 构建过程无错误（`npm run build`）
- [ ] 生产环境能正常访问
- [ ] HTTPS证书有效
- [ ] 飞书OAuth回调正常
- [ ] 用户信息正确显示

### 3. 配置错误诊断

常见配置错误及解决方法：

| 错误信息 | 可能原因 | 解决方法 |
|----------|----------|----------|
| `Missing Supabase environment variables` | Supabase配置缺失 | 检查并设置Supabase相关环境变量 |
| `Invalid state parameter` | OAuth状态参数错误 | 清除浏览器localStorage，重新登录 |
| `Failed to exchange code for token` | 飞书配置错误 | 检查App ID和Secret是否正确 |
| `CORS error` | 跨域配置问题 | 检查重定向URI配置是否正确 |

## 安全配置

### 1. 敏感信息保护

**生产环境注意事项**:
- ✅ 使用HTTPS协议
- ✅ 定期轮换密钥
- ✅ 限制重定向URI域名
- ✅ 监控异常访问

**开发环境注意事项**:
- ❌ 不要将 `.env` 文件提交到Git
- ❌ 不要在代码中硬编码密钥
- ❌ 不要共享包含密钥的配置文件

### 2. .gitignore 配置

确保以下文件被Git忽略：

```gitignore
# 环境变量文件
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 构建文件
build/
dist/

# 日志文件
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 3. 权限最小化

**Supabase权限**:
- 使用anon key而非service key
- 配置RLS（Row Level Security）策略
- 定期审查数据库权限

**飞书权限**:
- 只申请必需的用户权限
- 定期审查应用权限范围
- 监控API调用频率

## 环境切换

### 1. 多环境管理

创建不同环境的配置文件：

```
.env.development    # 开发环境
.env.staging       # 测试环境
.env.production    # 生产环境
```

### 2. 构建脚本

在 `package.json` 中添加不同环境的构建命令：

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "build:staging": "env-cmd -f .env.staging react-scripts build",
    "build:production": "env-cmd -f .env.production react-scripts build"
  }
}
```

需要安装 `env-cmd` 包：

```bash
npm install --save-dev env-cmd
```

## 故障排除

如果遇到配置相关问题，请参考：
- [故障排除指南](./troubleshooting.md)
- [飞书设置指南](./feishu-setup.md)

---

**提示**: 配置变更后记得重启开发服务器以使新配置生效。