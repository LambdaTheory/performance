import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import authAPI from '../services/authAPI';

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
      const userData = authAPI.getUserData();
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

  const login = async () => {
    try {
      const authUrl = await authAPI.generateAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login failed:', error);
      message.error('登录失败: ' + error.message);
    }
  };

  const handleAuthCallback = async (urlParams) => {
    setLoading(true);
    try {
      const userData = await authAPI.handleAuthCallback(urlParams);
      setUser(userData.user);
      setIsAuthenticated(true);
      
      // 添加用户ID显示逻辑
      console.log('=== 用户登录信息 ===');
      console.log('用户ID:', userData.user.id);
      console.log('用户姓名:', userData.user.name);
      console.log('用户邮箱:', userData.user.email);
      console.log('是否管理员:', userData.user.isAdmin);
      console.log('==================');
      
      // 在页面上也显示用户ID（可选）
      alert(`登录成功！\n\n用户ID: ${userData.user.id}\n姓名: ${userData.user.name}\n邮箱: ${userData.user.email}\n\n请将用户ID添加到服务器的 .env 文件中：\nADMIN_IDS=${userData.user.id}`);
      
      message.success(`欢迎回来，${userData.user.name}！`);
      
      // 清理URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return userData;
    } catch (error) {
      console.error('Auth callback failed:', error);
      message.error('登录失败: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      authAPI.logout();
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
      await authAPI.refreshToken();
      const userData = authAPI.getUserData();
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
    
    // 系统只有管理员角色，所有登录用户都是管理员
    return 'admin';
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