import axios from 'axios';

class FeishuAuthService {
  constructor() {
    this.appId = process.env.REACT_APP_FEISHU_APP_ID;
    this.appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    this.redirectUri = process.env.REACT_APP_FEISHU_REDIRECT_URI;
    this.baseUrl = 'https://open.feishu.cn/open-apis';
  }

  generateAuthUrl() {
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('feishu_oauth_state', state);
    
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: state,
      scope: 'contact:user.base:readonly'
    });

    return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code, state) {
    const savedState = localStorage.getItem('feishu_oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/authen/v1/access_token`, {
        grant_type: 'authorization_code',
        client_id: this.appId,
        client_secret: this.appSecret,
        code: code,
        redirect_uri: this.redirectUri
      });

      if (response.data.code !== 0) {
        throw new Error(response.data.msg || 'Failed to exchange code for token');
      }

      return response.data.data;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken) {
    try {
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
    try {
      const response = await axios.post(`${this.baseUrl}/auth/v3/app_access_token/internal`, {
        app_id: this.appId,
        app_secret: this.appSecret
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
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`Authentication error: ${error}`);
    }

    if (!code) {
      throw new Error('Authorization code not found');
    }

    const tokenData = await this.exchangeCodeForToken(code, state);
    const userInfo = await this.getUserInfo(tokenData.access_token);

    const userData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
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
    
    return userData;
  }

  saveUserData(userData) {
    localStorage.setItem('feishu_access_token', userData.accessToken);
    localStorage.setItem('feishu_refresh_token', userData.refreshToken);
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