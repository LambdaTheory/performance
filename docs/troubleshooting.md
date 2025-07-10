# 故障排除指南

本文档汇总了绩效问卷管理系统常见问题及解决方案，帮助快速诊断和解决问题。

## 目录
1. [认证相关问题](#认证相关问题)
2. [环境配置问题](#环境配置问题)
3. [网络连接问题](#网络连接问题)
4. [构建部署问题](#构建部署问题)
5. [用户权限问题](#用户权限问题)
6. [性能问题](#性能问题)
7. [调试工具](#调试工具)

## 认证相关问题

### 1. 无法跳转到飞书登录页面

**症状**: 点击登录按钮没有反应或报错

**可能原因**:
- 飞书App ID配置错误
- 重定向URI配置错误
- 网络连接问题

**解决方案**:

1. **检查环境变量**:
   ```bash
   # 在浏览器控制台检查
   console.log(process.env.REACT_APP_FEISHU_APP_ID);
   console.log(process.env.REACT_APP_FEISHU_REDIRECT_URI);
   ```

2. **验证App ID格式**:
   ```
   正确格式: cli_xxxxxxxxxxxxxxxxx
   错误格式: app_xxxxxxxxxxxxxxxxx
   ```

3. **检查重定向URI**:
   - 确保与飞书后台配置完全一致
   - 注意协议（http/https）
   - 注意端口号

### 2. 飞书授权后回调失败

**症状**: 授权成功但返回应用时显示错误或白屏

**可能原因**:
- state参数验证失败
- code换取token失败
- 用户信息获取失败

**解决方案**:

1. **清除localStorage**:
   ```javascript
   // 在浏览器控制台执行
   localStorage.clear();
   ```

2. **检查回调URL参数**:
   ```javascript
   // 检查URL是否包含code和state参数
   const urlParams = new URLSearchParams(window.location.search);
   console.log('code:', urlParams.get('code'));
   console.log('state:', urlParams.get('state'));
   ```

3. **验证App Secret**:
   - 确保App Secret正确
   - 注意Secret不要包含多余的空格
   - 确认Secret未过期

### 3. Token过期或刷新失败

**症状**: 登录一段时间后突然需要重新登录

**可能原因**:
- Access Token过期
- Refresh Token失效
- 时间同步问题

**解决方案**:

1. **检查Token过期时间**:
   ```javascript
   const expiresAt = localStorage.getItem('feishu_token_expires');
   console.log('Token expires at:', new Date(parseInt(expiresAt)));
   console.log('Current time:', new Date());
   ```

2. **手动刷新Token**:
   ```javascript
   // 在应用中调用
   await authContext.refreshToken();
   ```

3. **重新登录**:
   ```javascript
   // 如果刷新失败，清除认证状态
   authContext.logout();
   ```

## 环境配置问题

### 1. 环境变量未生效

**症状**: 修改.env文件后配置没有生效

**解决方案**:

1. **重启开发服务器**:
   ```bash
   # 停止服务器 (Ctrl+C)
   # 重新启动
   npm start
   ```

2. **检查变量名前缀**:
   ```env
   # React应用中环境变量必须以REACT_APP_开头
   REACT_APP_FEISHU_APP_ID=correct
   FEISHU_APP_ID=incorrect  # 这个不会被识别
   ```

3. **检查文件位置**:
   - 确保.env文件在项目根目录
   - 确保文件名正确（不是.env.txt）

### 2. 生产环境配置问题

**症状**: 开发环境正常，生产环境出现配置错误

**解决方案**:

1. **检查构建时环境变量**:
   ```bash
   # 构建时输出环境变量
   npm run build 2>&1 | grep REACT_APP
   ```

2. **验证构建产物**:
   ```bash
   # 检查构建后的文件是否包含正确配置
   grep -r "REACT_APP" build/static/js/
   ```

3. **使用正确的环境文件**:
   ```bash
   # 指定环境文件构建
   env-cmd -f .env.production npm run build
   ```

## 网络连接问题

### 1. CORS跨域错误

**症状**: 浏览器控制台显示CORS错误

**解决方案**:

1. **检查请求域名**:
   - 确保请求的是正确的飞书API域名
   - 检查是否有拼写错误

2. **验证重定向URI**:
   - 确保重定向URI在飞书后台已配置
   - 检查协议和端口是否匹配

3. **代理配置**（开发环境）:
   ```javascript
   // 在package.json中添加代理
   {
     "proxy": "https://open.feishu.cn"
   }
   ```

### 2. API请求超时

**症状**: 请求飞书API时超时

**解决方案**:

1. **检查网络连接**:
   ```bash
   # 测试飞书API连通性
   curl -I https://open.feishu.cn/open-apis/authen/v1/authorize
   ```

2. **增加超时时间**:
   ```javascript
   // 在axios配置中增加超时
   const response = await axios.post(url, data, {
     timeout: 10000 // 10秒超时
   });
   ```

3. **重试机制**:
   ```javascript
   // 实现重试逻辑
   const maxRetries = 3;
   for (let i = 0; i < maxRetries; i++) {
     try {
       const result = await apiCall();
       return result;
     } catch (error) {
       if (i === maxRetries - 1) throw error;
       await new Promise(resolve => setTimeout(resolve, 1000));
     }
   }
   ```

## 构建部署问题

### 1. 构建过程报错

**症状**: npm run build 失败

**常见错误及解决方案**:

1. **内存不足**:
   ```bash
   # 增加Node.js内存限制
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **TypeScript类型错误**:
   ```bash
   # 忽略TypeScript检查构建
   CI=false npm run build
   ```

3. **环境变量缺失**:
   ```bash
   # 检查所有必需的环境变量
   echo $REACT_APP_FEISHU_APP_ID
   echo $REACT_APP_SUPABASE_URL
   ```

### 2. 部署后页面空白

**症状**: 部署到服务器后页面显示空白

**解决方案**:

1. **检查构建文件**:
   ```bash
   # 确保build目录存在且有内容
   ls -la build/
   ls -la build/static/
   ```

2. **检查服务器配置**:
   - 确保静态文件正确映射
   - 检查SPA路由配置
   - 验证HTTPS设置

3. **查看浏览器错误**:
   - 打开浏览器开发者工具
   - 检查Console和Network标签
   - 查看具体错误信息

## 用户权限问题

### 1. 管理员功能无法访问

**症状**: 登录后看不到管理员菜单

**解决方案**:

1. **检查管理员邮箱配置**:
   ```javascript
   // 在浏览器控制台检查
   console.log(process.env.REACT_APP_ADMIN_EMAILS);
   ```

2. **验证用户邮箱**:
   ```javascript
   // 检查当前用户信息
   console.log(authContext.user);
   ```

3. **调试角色判断逻辑**:
   ```javascript
   // 检查角色判断结果
   console.log(authContext.getUserRole());
   ```

### 2. 飞书权限不足

**症状**: 获取用户信息失败

**解决方案**:

1. **检查应用权限**:
   - 登录飞书开放平台
   - 确认已申请必要权限
   - 等待权限审核通过

2. **重新授权**:
   ```javascript
   // 清除授权状态，重新授权
   authContext.logout();
   authContext.login();
   ```

## 性能问题

### 1. 页面加载缓慢

**优化方案**:

1. **代码分割**:
   ```javascript
   // 使用React.lazy懒加载组件
   const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
   ```

2. **压缩资源**:
   ```bash
   # 开启生产构建优化
   npm run build
   ```

3. **CDN优化**:
   - 将静态资源部署到CDN
   - 开启Gzip压缩

### 2. 内存泄漏

**症状**: 长时间使用后页面变慢

**解决方案**:

1. **清理事件监听器**:
   ```javascript
   useEffect(() => {
     const handler = () => {};
     window.addEventListener('resize', handler);
     return () => window.removeEventListener('resize', handler);
   }, []);
   ```

2. **清理定时器**:
   ```javascript
   useEffect(() => {
     const timer = setInterval(() => {}, 1000);
     return () => clearInterval(timer);
   }, []);
   ```

## 调试工具

### 1. 浏览器开发者工具

**常用调试命令**:

```javascript
// 检查当前认证状态
localStorage.getItem('feishu_access_token');

// 检查用户信息
JSON.parse(localStorage.getItem('feishu_user'));

// 检查环境变量
Object.keys(process.env).filter(key => key.startsWith('REACT_APP'));

// 清除所有存储数据
localStorage.clear();
sessionStorage.clear();
```

### 2. 网络请求调试

1. **打开Network标签**
2. **筛选XHR/Fetch请求**
3. **检查请求头和响应**
4. **查看错误状态码**

### 3. React开发者工具

安装React DevTools浏览器扩展：
- 查看组件状态
- 检查Context值
- 分析组件渲染

## 获取支持

如果以上方案都无法解决问题：

1. **查看控制台错误信息**
2. **收集重现步骤**
3. **记录环境信息**（浏览器版本、系统版本等）
4. **提供错误截图**
5. **联系技术支持**

### 错误报告模板

```markdown
## 问题描述
[详细描述遇到的问题]

## 重现步骤
1. 
2. 
3. 

## 预期结果
[描述期望的正确行为]

## 实际结果
[描述实际发生的错误]

## 环境信息
- 操作系统: 
- 浏览器: 
- Node.js版本: 
- 应用版本: 

## 错误信息
[粘贴控制台错误信息]

## 其他信息
[任何其他相关信息]
```

---

**提示**: 遇到问题时，先查看浏览器控制台的错误信息，这通常能提供最直接的线索。