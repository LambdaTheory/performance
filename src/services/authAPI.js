/**
 * 后端认证API服务
 * 通过后端处理飞书OAuth认证流程
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

class AuthAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.storageKeys = {
      user: 'feishu_user_data',
      token: 'feishu_access_token',
      expiresAt: 'feishu_token_expires_at'
    };
  }

  /**
   * 生成飞书OAuth授权URL
   */
  async generateAuthUrl() {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/feishu`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || '获取授权URL失败');
      }

      return response.data.authUrl;
    } catch (error) {
      console.error('Generate auth URL failed:', error);
      throw new Error(error.response?.data?.message || '获取授权URL失败');
    }
  }

  /**
   * 处理飞书OAuth回调
   */
  async handleAuthCallback(urlParams) {
    try {
      const params = new URLSearchParams(urlParams);
      const code = params.get('code');
      const state = params.get('state');

      if (!code) {
        throw new Error('缺少授权码');
      }

      console.log('发送认证回调到后端...', { code: code.substring(0, 10) + '...' });

      const response = await axios.post(`${this.baseUrl}/auth/feishu/callback`, {
        code,
        state
      });

      if (!response.data.success) {
        throw new Error(response.data.message || '认证失败');
      }

      const { user, token } = response.data;
      
      // 存储用户信息和token
      this.storeUserData(user, token);

      return { user, token };
    } catch (error) {
      console.error('Auth callback failed:', error);
      throw new Error(error.response?.data?.message || '认证回调处理失败');
    }
  }

  /**
   * 存储用户数据到localStorage
   */
  storeUserData(user, token) {
    try {
      const userData = {
        user,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKeys.user, JSON.stringify(userData));
      localStorage.setItem(this.storageKeys.token, token);
      
      // 设置token过期时间（7天）
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
      localStorage.setItem(this.storageKeys.expiresAt, expiresAt.toString());
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * 获取存储的用户数据
   */
  getUserData() {
    try {
      const userDataStr = localStorage.getItem(this.storageKeys.user);
      const token = localStorage.getItem(this.storageKeys.token);
      const expiresAt = localStorage.getItem(this.storageKeys.expiresAt);

      if (!userDataStr || !token || !expiresAt) {
        return null;
      }

      // 检查token是否过期
      if (Date.now() > parseInt(expiresAt)) {
        this.logout();
        return null;
      }

      const userData = JSON.parse(userDataStr);
      return userData;
    } catch (error) {
      console.error('Failed to get user data:', error);
      this.logout();
      return null;
    }
  }

  /**
   * 获取访问令牌
   */
  getAccessToken() {
    try {
      const expiresAt = localStorage.getItem(this.storageKeys.expiresAt);
      
      if (!expiresAt || Date.now() > parseInt(expiresAt)) {
        return null;
      }

      return localStorage.getItem(this.storageKeys.token);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * 刷新token（在实际应用中，应该通过后端refresh token机制）
   */
  async refreshToken() {
    // 当前简化实现：如果token过期就重新登录
    // 在生产环境中，应该实现refresh token机制
    const userData = this.getUserData();
    if (!userData) {
      throw new Error('用户未登录或token已过期');
    }
    
    return userData;
  }

  /**
   * 退出登录
   */
  logout() {
    try {
      localStorage.removeItem(this.storageKeys.user);
      localStorage.removeItem(this.storageKeys.token);
      localStorage.removeItem(this.storageKeys.expiresAt);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  /**
   * 检查用户是否已认证
   */
  isAuthenticated() {
    const userData = this.getUserData();
    return userData !== null;
  }
}

export default new AuthAPI();