import React, { useState } from 'react';
import { Layout, Menu, Button, Space } from 'antd';
import { 
  FormOutlined, 
  DashboardOutlined, 
  UserOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import SurveyForm from './components/SurveyForm';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const { Header, Content, Sider } = Layout;

function App() {
  const [currentView, setCurrentView] = useState('survey');
  const [userRole, setUserRole] = useState('admin'); // 临时设置为管理员，后续集成认证

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
            <UserOutlined /> 当前用户: 管理员
          </span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={() => {
              // TODO: 实现登出逻辑
              console.log('Logout clicked');
            }}
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

export default App;