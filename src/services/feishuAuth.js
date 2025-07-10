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
}

export default new FeishuAuthService();