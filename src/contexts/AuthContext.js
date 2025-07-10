import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import feishuAuth from '../services/feishuAuth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const userData = feishuAuth.getUserData();
      if (userData) {
        setUser(userData.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      message.error('认证初始化失败');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    try {
      const authUrl = feishuAuth.generateAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      // 检查是否是因为失败次数过多被阻止
      if (error.message.includes('认证服务已暂停')) {
        message.error(error.message, 10); // 显示10秒
      } else {
        message.error('登录失败，请重试');
      }
    }
  };

  const handleAuthCallback = async (urlParams) => {
    setLoading(true);
    try {
      const userData = await feishuAuth.handleAuthCallback(urlParams);
      setUser(userData.user);
      setIsAuthenticated(true);
      message.success(`欢迎回来，${userData.user.name}！`);
      
      // 清理URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return userData;
    } catch (error) {
      console.error('Auth callback failed:', error);
      // 检查是否是因为失败次数过多被阻止
      if (error.message.includes('认证服务已暂停')) {
        message.error(error.message, 10); // 显示10秒
      } else {
        message.error('登录失败: ' + error.message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      feishuAuth.logout();
      setUser(null);
      setIsAuthenticated(false);
      message.success('已成功退出登录');
    } catch (error) {
      console.error('Logout failed:', error);
      message.error('退出登录失败');
    }
  };

  const refreshToken = async () => {
    try {
      await feishuAuth.refreshToken();
      const userData = feishuAuth.getUserData();
      if (userData) {
        setUser(userData.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const getUserRole = () => {
    if (!user) return null;
    
    // 使用用户ID进行管理员识别
    const adminIds = process.env.REACT_APP_ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    
    // 检查用户ID是否在管理员列表中
    if (adminIds.includes(user.id)) {
      return 'admin';
    }
    
    return 'user';
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    handleAuthCallback,
    refreshToken,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};