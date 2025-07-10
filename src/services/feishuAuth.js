import axios from 'axios';

class FeishuAuthService {
  constructor() {
    this.appId = process.env.REACT_APP_FEISHU_APP_ID;
    this.appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    this.redirectUri = process.env.REACT_APP_FEISHU_REDIRECT_URI;
    // 在开发环境使用代理，生产环境使用直接URL
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? '/open-apis' 
      : 'https://open.feishu.cn/open-apis';
    
    // 失败重试管理
    this.failureCount = 0;
    this.maxFailures = 3;
    this.isBlocked = false;
    this.blockTimeout = null;
    this.blockDuration = 5 * 60 * 1000; // 5分钟
    
    
    if (!this.appId || !this.appSecret) {
      console.error('Missing Feishu configuration:', {
        appId: !!this.appId,
        appSecret: !!this.appSecret,
        redirectUri: !!this.redirectUri
      });
    }
  }

  // 检查是否被阻止
  checkIfBlocked() {
    if (this.isBlocked) {
      throw new Error(`认证服务已暂停，请 ${Math.ceil((this.blockDuration - (Date.now() - this.blockStartTime)) / 60000)} 分钟后重试`);
    }
  }

  // 记录失败并检查是否需要阻止
  recordFailure() {
    this.failureCount++;
    console.warn(`飞书认证失败次数: ${this.failureCount}/${this.maxFailures}`);
    
    if (this.failureCount >= this.maxFailures) {
      this.isBlocked = true;
      this.blockStartTime = Date.now();
      console.error(`飞书认证失败次数过多，服务暂停 ${this.blockDuration / 60000} 分钟`);
      
      // 设置自动解除阻止
      this.blockTimeout = setTimeout(() => {
        this.resetFailures();
      }, this.blockDuration);
    }
  }

  // 重置失败计数
  resetFailures() {
    this.failureCount = 0;
    this.isBlocked = false;
    this.blockStartTime = null;
    if (this.blockTimeout) {
      clearTimeout(this.blockTimeout);
      this.blockTimeout = null;
    }
  }

  generateAuthUrl() {
    this.checkIfBlocked();
    
    // 重新获取环境变量，避免React严格模式下的问题
    const appId = process.env.REACT_APP_FEISHU_APP_ID;
    const redirectUri = process.env.REACT_APP_FEISHU_REDIRECT_URI;

    if (!appId || !redirectUri) {
      console.error('Missing environment variables for auth URL:', {
        REACT_APP_FEISHU_APP_ID: !!appId,
        REACT_APP_FEISHU_REDIRECT_URI: !!redirectUri
      });
      throw new Error('missing app id or redirect uri');
    }

    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('feishu_oauth_state', state);
    
    const params = new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      scope: 'contact:user.base:readonly'
    });

    return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code, state) {
    this.checkIfBlocked();
    
    const savedState = localStorage.getItem('feishu_oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    // 重新获取环境变量，避免React严格模式下的问题
    const appId = process.env.REACT_APP_FEISHU_APP_ID;
    const appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    const redirectUri = process.env.REACT_APP_FEISHU_REDIRECT_URI;


    if (!appId || !appSecret) {
      console.error('Missing environment variables:', {
        REACT_APP_FEISHU_APP_ID: !!appId,
        REACT_APP_FEISHU_APP_SECRET: !!appSecret,
        REACT_APP_FEISHU_REDIRECT_URI: !!redirectUri
      });
      this.recordFailure();
      throw new Error('missing app id or app secret');
    }


    try {
      // 使用v2 API端点
      const response = await axios.post(`${this.baseUrl}/authen/v2/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: appId,
        client_secret: appSecret,
        code: code,
        redirect_uri: redirectUri
      });


      // v2 API可能有不同的响应格式
      if (response.data.error) {
        // v2 API错误格式
        this.recordFailure();
        throw new Error(response.data.error_description || response.data.error);
      }
      
      if (response.data.code && response.data.code !== 0) {
        // v1 API错误格式
        this.recordFailure();
        throw new Error(response.data.msg || 'Failed to exchange code for token');
      }

      // 成功时重置失败计数
      this.resetFailures();
      
      // v2 API响应可能直接包含token数据，而不是在data字段中
      if (response.data.access_token) {
        return response.data;
      } else if (response.data.data) {
        return response.data.data;
      } else {
        throw new Error('Unexpected response format from token exchange');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      // 网络错误或其他异常也记录失败
      this.recordFailure();
      throw error;
    }
  }

  async getUserInfo(accessToken) {
    try {
      // 检查v2端点是否可用
      const response = await axios.get(`${this.baseUrl}/authen/v1/user_info`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to get user info');
      }

      return response.data.data;
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  }

  async getAppAccessToken() {
    // 重新获取环境变量，避免React严格模式下的问题
    const appId = process.env.REACT_APP_FEISHU_APP_ID;
    const appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('Missing environment variables for app access token:', {
        REACT_APP_FEISHU_APP_ID: !!appId,
        REACT_APP_FEISHU_APP_SECRET: !!appSecret
      });
      throw new Error('missing app id or app secret');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/auth/v3/app_access_token/internal`, {
        app_id: appId,
        app_secret: appSecret
      });

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to get app access token');
      }

      return response.data.app_access_token;
    } catch (error) {
      console.error('Get app access token error:', error);
      throw error;
    }
  }

  // 获取 tenant_access_token（用于获取组织内所有用户）
  async getTenantAccessToken() {
    const appId = process.env.REACT_APP_FEISHU_APP_ID;
    const appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('missing app id or app secret');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
        app_id: appId,
        app_secret: appSecret
      });

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to get tenant access token');
      }

      return response.data.tenant_access_token;
    } catch (error) {
      console.error('Get tenant access token error:', error);
      throw error;
    }
  }

  async handleAuthCallback(urlParams) {
    this.checkIfBlocked();
    
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      this.recordFailure();
      throw new Error(`Authentication error: ${error}`);
    }

    if (!code) {
      this.recordFailure();
      throw new Error('Authorization code not found');
    }

    try {
      const tokenData = await this.exchangeCodeForToken(code, state);
      const userInfo = await this.getUserInfo(tokenData.access_token);

      const userData = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null, // v2 API可能没有refresh_token
        expiresIn: tokenData.expires_in,
        user: {
          id: userInfo.user_id,
          name: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.avatar_url,
          mobile: userInfo.mobile,
          openId: userInfo.open_id,
          unionId: userInfo.union_id
        }
      };

      this.saveUserData(userData);
      localStorage.removeItem('feishu_oauth_state');
      
      // 成功时重置失败计数
      this.resetFailures();
      return userData;
    } catch (error) {
      // exchangeCodeForToken 和 getUserInfo 内部已经处理失败记录
      throw error;
    }
  }

  saveUserData(userData) {
    localStorage.setItem('feishu_access_token', userData.accessToken);
    if (userData.refreshToken) {
      localStorage.setItem('feishu_refresh_token', userData.refreshToken);
    }
    localStorage.setItem('feishu_user', JSON.stringify(userData.user));
    localStorage.setItem('feishu_token_expires', Date.now() + userData.expiresIn * 1000);
  }

  getUserData() {
    const accessToken = localStorage.getItem('feishu_access_token');
    const userStr = localStorage.getItem('feishu_user');
    const expiresAt = localStorage.getItem('feishu_token_expires');

    if (!accessToken || !userStr || !expiresAt) {
      return null;
    }

    if (Date.now() > parseInt(expiresAt)) {
      this.logout();
      return null;
    }

    return {
      accessToken,
      user: JSON.parse(userStr)
    };
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('feishu_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/authen/v1/refresh_access_token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to refresh token');
      }

      const tokenData = response.data.data;
      const userData = this.getUserData();
      
      if (userData) {
        userData.accessToken = tokenData.access_token;
        userData.refreshToken = tokenData.refresh_token;
        userData.expiresIn = tokenData.expires_in;
        this.saveUserData(userData);
      }

      return tokenData;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('feishu_access_token');
    localStorage.removeItem('feishu_refresh_token');
    localStorage.removeItem('feishu_user');
    localStorage.removeItem('feishu_token_expires');
    localStorage.removeItem('feishu_oauth_state');
  }

  isAuthenticated() {
    const userData = this.getUserData();
    return userData !== null;
  }

  // 获取通讯录用户列表
  async getContactUsers(pageToken = '', pageSize = 50) {
    try {
      console.log('=== 开始获取飞书用户列表 ===');
      const appAccessToken = await this.getAppAccessToken();
      console.log('App Access Token获取成功');
      
      const params = new URLSearchParams({
        page_size: pageSize.toString(),
        user_id_type: 'user_id' // 明确指定返回user_id
      });
      
      if (pageToken) {
        params.append('page_token', pageToken);
      }
      
      const url = `${this.baseUrl}/contact/v3/users?${params.toString()}`;
      console.log('请求URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API响应状态:', response.status);
      console.log('API响应数据:', JSON.stringify(response.data, null, 2));

      if (response.data.code !== 0) {
        console.error('API返回错误:', response.data);
        throw new Error(response.data.msg || 'Failed to get contact users');
      }

      const result = response.data.data;
      console.log(`获取到用户数量: ${result?.items?.length || 0}`);
      console.log(`是否还有更多: ${result?.has_more}`);
      console.log(`下一页Token: ${result?.page_token || 'none'}`);

      return result;
    } catch (error) {
      console.error('Get contact users error:', error);
      if (error.response) {
        console.error('错误响应状态:', error.response.status);
        console.error('错误响应数据:', error.response.data);
      }
      throw error;
    }
  }

  // 获取所有用户（分页获取）
  async getAllContactUsers() {
    const allUsers = [];
    let pageToken = '';
    let hasMore = true;
    let pageCount = 0;

    try {
      console.log('=== 开始分页获取所有用户 ===');
      
      while (hasMore) {
        pageCount++;
        console.log(`正在获取第 ${pageCount} 页，pageToken: ${pageToken || 'empty'}`);
        
        const result = await this.getContactUsers(pageToken, 50);
        
        if (result && result.items) {
          console.log(`第 ${pageCount} 页获取到 ${result.items.length} 个用户`);
          allUsers.push(...result.items);
        } else {
          console.log(`第 ${pageCount} 页没有获取到用户数据`);
        }
        
        hasMore = result?.has_more || false;
        pageToken = result?.page_token || '';
        
        console.log(`hasMore: ${hasMore}, nextPageToken: ${pageToken || 'none'}`);
        
        // 防止无限循环
        if (pageCount > 10) {
          console.warn('已获取10页数据，停止获取防止无限循环');
          break;
        }
      }

      console.log(`=== 分页获取完成，总共获取到 ${allUsers.length} 个用户 ===`);
      return allUsers;
    } catch (error) {
      console.error('Get all contact users error:', error);
      console.error('当前已获取用户数量:', allUsers.length);
      throw error;
    }
  }

  // 获取部门列表
  async getDepartments(pageToken = '', pageSize = 50) {
    try {
      const appAccessToken = await this.getAppAccessToken();
      
      // 尝试不同的参数组合
      const params = new URLSearchParams({
        page_size: pageSize.toString(),
        department_id_type: 'department_id',
        fetch_child: true  // 获取子部门
      });
      
      if (pageToken) {
        params.append('page_token', pageToken);
      }
      
      const url = `${this.baseUrl}/contact/v3/departments?${params.toString()}`;
      console.log('部门API请求URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('部门列表API响应:', JSON.stringify(response.data, null, 2));

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to get departments');
      }

      return response.data.data;
    } catch (error) {
      console.error('Get departments error:', error);
      throw error;
    }
  }

  // 尝试获取根部门
  async getRootDepartments() {
    try {
      console.log('=== 尝试获取根部门 ===');
      const appAccessToken = await this.getAppAccessToken();
      
      // 不传parent_department_id参数，获取根部门
      const response = await axios.get(`${this.baseUrl}/contact/v3/departments`, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`
        },
        params: {
          page_size: 50,
          department_id_type: 'department_id'
        }
      });

      console.log('根部门API响应:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('获取根部门错误:', error);
      throw error;
    }
  }

  // 尝试通过用户获取部门信息
  async getDepartmentsByUser() {
    try {
      console.log('=== 尝试通过用户获取部门信息 ===');
      const users = await this.getContactUsers('', 10);
      
      if (users?.items && users.items.length > 0) {
        const user = users.items[0];
        console.log('用户详细信息:', JSON.stringify(user, null, 2));
        
        // 检查用户是否有部门信息
        if (user.department_ids && user.department_ids.length > 0) {
          console.log('用户所属部门ID列表:', user.department_ids);
          
          // 尝试获取具体部门信息
          const appAccessToken = await this.getAppAccessToken();
          const deptId = user.department_ids[0];
          
          const deptResponse = await axios.get(`${this.baseUrl}/contact/v3/departments/${deptId}`, {
            headers: {
              'Authorization': `Bearer ${appAccessToken}`
            },
            params: {
              department_id_type: 'department_id'
            }
          });
          
          console.log('具体部门信息:', JSON.stringify(deptResponse.data, null, 2));
          return deptResponse.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('通过用户获取部门信息错误:', error);
      throw error;
    }
  }

  // 备用方法：尝试使用不同的API端点获取用户
  async getContactUsersV1(pageToken = '', pageSize = 50) {
    try {
      console.log('=== 尝试使用v1 API获取用户列表 ===');
      const appAccessToken = await this.getAppAccessToken();
      
      const params = new URLSearchParams({
        page_size: pageSize.toString()
      });
      
      if (pageToken) {
        params.append('page_token', pageToken);
      }
      
      const url = `${this.baseUrl}/contact/v1/user/batch_get?${params.toString()}`;
      console.log('V1 API请求URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`
        }
      });

      console.log('V1 API响应:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('V1 API错误:', error);
      throw error;
    }
  }

  // 尝试不同的用户查询参数
  async getContactUsersWithDifferentParams(pageToken = '', pageSize = 50) {
    try {
      console.log('=== 尝试不同参数获取用户列表 ===');
      const appAccessToken = await this.getAppAccessToken();
      
      // 尝试不同的参数组合
      const paramCombinations = [
        // 基本参数
        {
          page_size: pageSize.toString(),
          user_id_type: 'user_id'
        },
        // 添加部门参数
        {
          page_size: pageSize.toString(),
          user_id_type: 'user_id',
          department_id_type: 'department_id'
        },
        // 尝试open_id
        {
          page_size: pageSize.toString(),
          user_id_type: 'open_id'
        },
        // 尝试union_id
        {
          page_size: pageSize.toString(),
          user_id_type: 'union_id'
        }
      ];
      
      for (let i = 0; i < paramCombinations.length; i++) {
        const params = new URLSearchParams(paramCombinations[i]);
        if (pageToken) {
          params.append('page_token', pageToken);
        }
        
        const url = `${this.baseUrl}/contact/v3/users?${params.toString()}`;
        console.log(`尝试参数组合 ${i + 1}:`, url);
        
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${appAccessToken}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`参数组合 ${i + 1} 响应:`, JSON.stringify(response.data, null, 2));
          
          if (response.data.code === 0 && response.data.data?.items?.length > 1) {
            console.log(`✓ 参数组合 ${i + 1} 成功返回 ${response.data.data.items.length} 个用户`);
            return response.data.data;
          }
        } catch (error) {
          console.error(`参数组合 ${i + 1} 失败:`, error.response?.data || error.message);
        }
      }
      
      // 如果所有组合都失败，返回第一个组合的结果
      const defaultParams = new URLSearchParams(paramCombinations[0]);
      if (pageToken) {
        defaultParams.append('page_token', pageToken);
      }
      
      const response = await axios.get(`${this.baseUrl}/contact/v3/users?${defaultParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('所有参数组合都失败:', error);
      throw error;
    }
  }

  // 尝试获取应用信息和权限范围
  async getAppInfo() {
    try {
      console.log('=== 获取应用信息和权限范围 ===');
      const appAccessToken = await this.getAppAccessToken();
      
      // 尝试获取应用信息
      const response = await axios.get(`${this.baseUrl}/application/v6/applications/self`, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`
        }
      });
      
      console.log('应用信息:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('获取应用信息失败:', error);
      throw error;
    }
  }

  // 递归获取所有部门
  async getAllDepartments() {
    try {
      console.log('=== 开始递归获取所有部门 ===');
      const tenantAccessToken = await this.getTenantAccessToken();
      const allDepartments = [];
      
      // 从根部门开始递归
      await this.getDepartmentChildren('0', tenantAccessToken, allDepartments);
      
      console.log(`获取到总部门数: ${allDepartments.length}`);
      return allDepartments;
    } catch (error) {
      console.error('获取所有部门错误:', error);
      throw error;
    }
  }

  // 递归获取子部门
  async getDepartmentChildren(departmentId, tenantAccessToken, allDepartments) {
    try {
      let pageToken = '';
      let hasMore = true;
      
      while (hasMore) {
        const params = new URLSearchParams({
          department_id: departmentId,
          page_size: '50',
          department_id_type: 'department_id'
        });
        
        if (pageToken) {
          params.append('page_token', pageToken);
        }
        
        const response = await axios.get(`${this.baseUrl}/contact/v3/departments/${departmentId}/children`, {
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`
          },
          params: params
        });
        
        if (response.data.code !== 0) {
          throw new Error(response.data.msg || 'Failed to get department children');
        }
        
        const departments = response.data.data?.items || [];
        allDepartments.push(...departments);
        
        // 对每个子部门递归获取其子部门
        for (const dept of departments) {
          await this.getDepartmentChildren(dept.department_id, tenantAccessToken, allDepartments);
        }
        
        hasMore = response.data.data?.has_more || false;
        pageToken = response.data.data?.page_token || '';
      }
    } catch (error) {
      console.error(`获取部门 ${departmentId} 的子部门错误:`, error);
      throw error;
    }
  }

  // 按部门获取用户（分页）
  async getUsersByDepartment(departmentId, tenantAccessToken, pageToken = '', pageSize = 500) {
    try {
      const params = new URLSearchParams({
        department_id: departmentId,
        page_size: pageSize.toString(),
        user_id_type: 'open_id'
      });
      
      if (pageToken) {
        params.append('page_token', pageToken);
      }
      
      const response = await axios.get(`${this.baseUrl}/contact/v3/users/find_by_department`, {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`
        },
        params: params
      });
      
      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to get users by department');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`获取部门 ${departmentId} 用户错误:`, error);
      throw error;
    }
  }

  // 获取所有用户（新的实现）
  async getAllUsersFromDepartments() {
    try {
      console.log('=== 开始从部门获取所有用户 ===');
      const tenantAccessToken = await this.getTenantAccessToken();
      
      // 1. 获取所有部门
      const departments = await this.getAllDepartments();
      console.log(`获取到 ${departments.length} 个部门`);
      
      // 2. 从每个部门获取用户
      const allUsers = new Map(); // 使用 Map 去重
      let totalFetched = 0;
      let processedDepts = 0;
      
      for (const dept of departments) {
        try {
          console.log(`正在处理部门: ${dept.name} (${dept.department_id}) [${++processedDepts}/${departments.length}]`);
          
          let pageToken = '';
          let hasMore = true;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (hasMore) {
            try {
              const result = await this.getUsersByDepartment(
                dept.department_id, 
                tenantAccessToken, 
                pageToken, 
                500
              );
              
              const users = result?.items || [];
              console.log(`部门 ${dept.name} 获取到 ${users.length} 个用户`);
              
              // 过滤在职用户并去重
              for (const user of users) {
                if (user.status?.is_resigned === false && user.status?.is_frozen === false) {
                  allUsers.set(user.user_id, {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    department_ids: user.department_ids,
                    job_title: user.job_title,
                    avatar: user.avatar,
                    status: user.status,
                    sync_time: new Date().toISOString()
                  });
                }
              }
              
              totalFetched += users.length;
              hasMore = result?.has_more || false;
              pageToken = result?.page_token || '';
              
              // 重置重试计数
              retryCount = 0;
              
              // 添加延迟避免频率限制
              if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } catch (pageError) {
              retryCount++;
              if (retryCount <= maxRetries) {
                console.warn(`部门 ${dept.name} 分页获取失败，第 ${retryCount} 次重试:`, pageError.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              } else {
                console.error(`部门 ${dept.name} 分页获取失败，跳过:`, pageError.message);
                break;
              }
            }
          }
        } catch (deptError) {
          console.error(`处理部门 ${dept.name} 失败:`, deptError.message);
          continue;
        }
      }
      
      const uniqueUsers = Array.from(allUsers.values());
      console.log(`总共获取 ${totalFetched} 个用户记录，去重后 ${uniqueUsers.length} 个在职用户`);
      
      return uniqueUsers;
    } catch (error) {
      console.error('获取所有用户错误:', error);
      throw error;
    }
  }

  // 尝试获取当前用户有权限查看的用户列表
  async getAccessibleUsers() {
    try {
      console.log('=== 尝试获取当前用户可访问的用户列表 ===');
      const appAccessToken = await this.getAppAccessToken();
      
      // 尝试获取部门信息
      const deptResponse = await axios.get(`${this.baseUrl}/contact/v3/departments`, {
        headers: {
          'Authorization': `Bearer ${appAccessToken}`
        },
        params: {
          page_size: 50,
          department_id_type: 'department_id'
        }
      });
      
      console.log('可访问的部门:', JSON.stringify(deptResponse.data, null, 2));
      
      return deptResponse.data;
    } catch (error) {
      console.error('获取可访问用户列表错误:', error);
      throw error;
    }
  }
}

export default new FeishuAuthService();