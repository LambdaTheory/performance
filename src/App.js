import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Spin } from 'antd';
import { 
  FormOutlined, 
  DashboardOutlined, 
  UserOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SurveyForm from './components/SurveyForm';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import './App.css';

const { Header, Content, Sider } = Layout;

function MainApp() {
  const [currentView, setCurrentView] = useState('survey');
  const { user, isAuthenticated, loading, logout, getUserRole } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const userRole = getUserRole();

  const menuItems = [
    {
      key: 'survey',
      icon: <FormOutlined />,
      label: '填写问卷',
    },
    {
      key: 'admin',
      icon: <DashboardOutlined />,
      label: '管理后台',
      disabled: userRole !== 'admin'
    }
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'survey':
        return <SurveyForm />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <SurveyForm />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#fff', 
        borderBottom: '1px solid #e8e8e8',
        padding: '0 24px'
      }}>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#1890ff' 
        }}>
          绩效问卷管理系统
        </div>
        
        <Space>
          <span style={{ color: '#666' }}>
            <UserOutlined /> 当前用户: {user?.name || '未知用户'} 
            {userRole === 'admin' && <span style={{ color: '#52c41a', marginLeft: 8 }}>[管理员]</span>}
            {userRole === 'user' && <span style={{ color: '#1890ff', marginLeft: 8 }}>[普通用户]</span>}
          </span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Sider 
          width={200} 
          style={{ 
            background: '#fff', 
            borderRight: '1px solid #e8e8e8' 
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[currentView]}
            items={menuItems}
            onClick={({ key }) => setCurrentView(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        
        <Layout>
          <Content style={{ 
            background: '#f5f5f5',
            minHeight: 280 
          }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;