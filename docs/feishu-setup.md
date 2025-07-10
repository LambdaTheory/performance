# 飞书OAuth集成设置指南

本文档详细介绍如何在绩效问卷管理系统中集成飞书OAuth认证。

## 目录
1. [前置条件](#前置条件)
2. [创建飞书应用](#创建飞书应用)
3. [配置应用权限](#配置应用权限)
4. [设置重定向URI](#设置重定向uri)
5. [获取应用凭证](#获取应用凭证)
6. [本地环境配置](#本地环境配置)
7. [生产环境部署](#生产环境部署)
8. [测试认证流程](#测试认证流程)

## 前置条件

- 拥有飞书企业管理员权限
- 已安装Node.js和npm
- 项目代码已克隆到本地

## 创建飞书应用

### 1. 访问飞书开放平台

访问 [飞书开放平台](https://open.feishu.cn/) 并使用企业管理员账号登录。

### 2. 创建应用

1. 点击 **"开发者后台"**
2. 选择 **"创建企业自建应用"**
3. 填写应用信息：
   - **应用名称**: 绩效问卷管理系统
   - **应用描述**: 企业内部绩效评估和问卷管理系统
   - **应用图标**: 上传应用图标（可选）

![创建应用示例](images/create-app.png)

### 3. 记录应用信息

应用创建成功后，记录以下信息：
- **App ID**: `cli_xxxxxxxxxxxxxxxxx`
- **App Secret**: 在"凭证与基础信息"页面获取

## 配置应用权限

### 1. 配置应用权限范围

在应用管理页面，进入 **"权限管理"** 标签：

1. **用户权限**:
   - ✅ `contact:user.base:readonly` - 获取用户基本信息
   - ✅ `contact:user.email:readonly` - 获取用户邮箱（可选）

2. **其他权限**（根据需要添加）:
   - `contact:department.base:readonly` - 获取部门信息
   - `contact:user.employee_id:readonly` - 获取员工ID

### 2. 申请权限

添加权限后需要提交审核，等待企业管理员批准。

## 设置重定向URI

### 1. 配置OAuth重定向

在 **"安全设置"** 页面配置重定向URI：

**开发环境**:
```
http://localhost:3000
```

**生产环境**（示例）:
```
https://your-domain.com
https://survey.yourcompany.com
```

### 2. 重要注意事项

- 重定向URI必须完全匹配，包括协议、域名、端口
- 生产环境必须使用HTTPS
- 可以配置多个重定向URI

## 获取应用凭证

### 1. 获取App Secret

1. 进入应用详情页
2. 点击 **"凭证与基础信息"**
3. 复制 **App Secret**（仅显示一次，请妥善保存）

### 2. 安全提醒

⚠️ **重要**: App Secret是敏感信息，请：
- 不要将其提交到代码仓库
- 不要在前端代码中硬编码
- 使用环境变量进行配置
- 定期轮换Secret

## 本地环境配置

### 1. 创建环境变量文件

复制环境变量模板：

```bash
cp .env.example .env
```

### 2. 配置飞书OAuth参数

编辑 `.env` 文件：

```env
# 飞书OAuth配置
REACT_APP_FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxx
REACT_APP_FEISHU_APP_SECRET=your_app_secret_here
REACT_APP_FEISHU_REDIRECT_URI=http://localhost:3000

# 管理员邮箱列表（用逗号分隔）
REACT_APP_ADMIN_EMAILS=admin@yourcompany.com,hr@yourcompany.com
```

### 3. 安装依赖并启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start
```

## 生产环境部署

### 1. 环境变量配置

在生产环境中设置以下环境变量：

```bash
export REACT_APP_FEISHU_APP_ID="cli_xxxxxxxxxxxxxxxxx"
export REACT_APP_FEISHU_APP_SECRET="your_production_secret"
export REACT_APP_FEISHU_REDIRECT_URI="https://your-domain.com"
export REACT_APP_ADMIN_EMAILS="admin@yourcompany.com"
```

### 2. 构建应用

```bash
npm run build
```

### 3. 部署注意事项

- 确保生产环境域名已在飞书后台配置
- 使用HTTPS协议
- 定期备份应用凭证
- 监控认证失败日志

## 测试认证流程

### 1. 基本测试流程

1. **启动应用**: `npm start`
2. **访问应用**: http://localhost:3000
3. **点击登录**: 应该跳转到飞书授权页面
4. **授权登录**: 使用企业飞书账号登录
5. **验证回调**: 检查是否成功返回并显示用户信息

### 2. 测试检查点

- [ ] 登录按钮正常显示
- [ ] 点击登录跳转到飞书授权页
- [ ] 授权后能正确回调到应用
- [ ] 用户信息正确显示
- [ ] 角色权限正确分配
- [ ] 登出功能正常工作

### 3. 常见问题排查

如果遇到问题，请查看 [故障排除指南](./troubleshooting.md)。

## 开发调试

### 1. 开启调试日志

在开发环境中，可以通过浏览器控制台查看详细的认证流程日志。

### 2. 测试不同角色

通过修改 `REACT_APP_ADMIN_EMAILS` 环境变量来测试不同的用户角色：

```env
# 测试管理员
REACT_APP_ADMIN_EMAILS=test-admin@yourcompany.com

# 测试普通用户（留空）
REACT_APP_ADMIN_EMAILS=
```

## 安全最佳实践

1. **定期轮换凭证**: 建议每3-6个月更换App Secret
2. **最小权限原则**: 只申请必需的用户权限
3. **监控异常**: 记录并监控认证失败事件
4. **HTTPS only**: 生产环境必须使用HTTPS
5. **环境隔离**: 开发和生产环境使用不同的应用

## 相关文档

- [环境配置指南](./environment-config.md)
- [故障排除指南](./troubleshooting.md)
- [飞书开放平台官方文档](https://open.feishu.cn/document/home/user-identity-introduction/introduction)

---

**注意**: 本文档基于飞书开放平台2024年版本编写，如有API变更请参考最新官方文档。