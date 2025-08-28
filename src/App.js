import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Space, Spin, Tabs, Table, message, Upload, Select, Card, Progress, List, Tag, Modal, Input } from 'antd';
import ReactECharts from 'echarts-for-react';
import { 
  FormOutlined, 
  DashboardOutlined, 
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  BellOutlined,
  DownOutlined,
  RightOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import PerformanceSection from './pages/PerformanceSection';
import './App.css';


const { Header, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { Dragger } = Upload;







function MainApp() {
  const [activeMainTab, setActiveMainTab] = useState('performance');
  const { user, isAuthenticated, loading, logout, getUserRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  // 顶部一级Tab配置
  // 删除第339-342行的问卷管理标签页
  // 将 mainTabs 修改为：
  // 修改 mainTabs 配置，删除问卷和待办相关标签页
  const mainTabs = [
    {
      key: 'performance',
      label: '绩效',
      icon: <CheckCircleOutlined />,
      component: <PerformanceSection />
    }
    // 删除 interview-survey 和 todo 标签页
  ];

  const renderContent = () => {
    const currentTab = mainTabs.find(tab => tab.key === activeMainTab);
    return currentTab ? currentTab.component : <PerformanceSection />;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#fff', 
        borderBottom: '1px solid #e8e8e8',
        padding: '0 24px',
        height: '64px' // 固定Header高度
      }}>
        {/* 左侧：一级Tab栏 */}
        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          size="large"
          style={{ 
            flex: 1,
            height: '64px', // 与Header高度一致
            display: 'flex',
            alignItems: 'center'
          }}
          className="header-tabs"
        >
          {mainTabs.map(tab => (
            <TabPane
              tab={
                <span>
                  {tab.icon}
                  {tab.label}
                </span>
              }
              key={tab.key}
            />
          ))}
        </Tabs>
        
        {/* 右侧：用户信息和退出按钮 */}
        <Space style={{ height: '64px', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>
            <UserOutlined /> 当前用户: {user?.name || '未知用户'} 
            <span style={{ color: '#52c41a', marginLeft: 8 }}>[管理员]</span>
          </span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={logout}
            style={{ height: 'auto' }}
          >
            退出
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Content style={{ 
          background: '#f5f5f5',
          minHeight: 280 
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}









function App() {
  return (
    <AuthProvider>
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
}

export default App;
