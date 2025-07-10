import React, { useEffect } from 'react';
import { Button, Card, Space, Typography, Spin } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const { login, handleAuthCallback, loading } = useAuth();

  useEffect(() => {
    // 检查是否是从飞书回调返回
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      // 使用 ref 防止 React Strict Mode 重复执行
      const hasProcessed = sessionStorage.getItem(`oauth_processed_${code}`);
      if (!hasProcessed) {
        sessionStorage.setItem(`oauth_processed_${code}`, 'true');
        handleAuthCallback(urlParams);
      }
    }
  }, []); // 移除依赖，只在组件挂载时执行一次

  const handleLogin = () => {
    login();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <Text style={{ marginTop: 16 }}>正在登录中...</Text>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: 400,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '16px',
          border: 'none'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <TeamOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              绩效问卷管理系统
            </Title>
            <Text type="secondary">
              使用飞书账号登录，开始您的绩效评估之旅
            </Text>
          </div>

          <div style={{ padding: '20px 0' }}>
            <Button
              type="primary"
              size="large"
              icon={<UserOutlined />}
              onClick={handleLogin}
              style={{
                width: '100%',
                height: '48px',
                fontSize: '16px',
                borderRadius: '8px',
                background: '#00b96b',
                borderColor: '#00b96b'
              }}
            >
              使用飞书账号登录
            </Button>
          </div>

          <div style={{ textAlign: 'left', fontSize: '12px', color: '#666' }}>
            <Text type="secondary">
              登录即表示您同意我们的服务条款和隐私政策
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;