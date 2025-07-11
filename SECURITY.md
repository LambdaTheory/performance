# 安全说明

## 重要安全提醒

### 飞书 App Secret 安全问题

目前代码中存在一个安全问题：**前端直接使用飞书 App Secret**。

**当前状态**：
- 前端代码中使用 `REACT_APP_FEISHU_APP_SECRET` 环境变量
- 这个 secret 会被编译到前端 bundle 中，可能被恶意用户获取

**建议的解决方案**：
1. **后端代理方式**：
   - 前端只处理 authorization code
   - 将 code 发送到后端 API
   - 后端使用 app secret 完成 token 交换
   - 后端返回用户信息给前端

2. **修改步骤**：
   ```javascript
   // 前端：获取 code 后发送到后端
   const response = await fetch('/api/auth/feishu/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code, redirect_uri })
   });
   
   // 后端：处理 token 交换
   app.post('/api/auth/feishu/token', async (req, res) => {
     const { code, redirect_uri } = req.body;
     const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
       grant_type: 'authorization_code',
       client_id: process.env.FEISHU_APP_ID,
       client_secret: process.env.FEISHU_APP_SECRET,
       code,
       redirect_uri
     });
     // 处理响应并返回用户信息
   });
   ```

### 当前部署配置

**为了保持现有功能**，Docker 配置已经移除了 `REACT_APP_FEISHU_APP_SECRET` 的相关配置。

**如果需要使用当前的不安全方式**：
- 手动在 Dokploy 中添加 `REACT_APP_FEISHU_APP_SECRET` 环境变量
- 在 docker-compose.yml 中添加相应的 build args

**不建议这样做**，因为这会暴露敏感信息。

## 其他安全建议

1. **环境变量管理**：
   - 生产环境的敏感信息应该通过安全的方式管理
   - 避免在前端暴露任何 secret 或 token

2. **API 安全**：
   - 后端 API 应该有适当的认证和授权
   - 使用 HTTPS 传输敏感数据

3. **日志安全**：
   - 避免在日志中记录敏感信息
   - 定期审查日志内容

## 修复优先级

**高优先级**：移除前端对 `REACT_APP_FEISHU_APP_SECRET` 的依赖
**中优先级**：实现后端代理认证
**低优先级**：其他安全增强