import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useAuth } from '../contexts/AuthContext';

// 导入页面组件
import CurrentPerformance from './CurrentPerformance';
import EmployeeHistoryPerformance from './EmployeeHistoryPerformance';
import CompanyPerformance from './CompanyPerformance';

/**
 * 绩效管理主页面组件
 * 负责管理三个子页面的 Tab 切换：
 * 1. 本周期绩效 - 当前考核周期的绩效管理
 * 2. 员工绩效档案 - 员工历史绩效查看
 * 3. 公司绩效 - 公司整体绩效分析
 */
function PerformanceSection() {
  const { getUserRole } = useAuth();
  const userRole = getUserRole();
  const [activeTab, setActiveTab] = useState('current-performance');
  
  const tabItems = [
    {
      key: 'current-performance',
      label: '本周期绩效',
      children: <CurrentPerformance />
    },
    {
      key: 'employee-history',
      label: '员工绩效档案',
      children: <EmployeeHistoryPerformance />
    },
    {
      key: 'company-performance',
      label: '公司绩效',
      children: <CompanyPerformance />
    }
  ];
  
  return (
    <div style={{ padding: '24px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabPosition="left"
        style={{ minHeight: '500px' }}
        items={tabItems}
      />
    </div>
  );
}

export default PerformanceSection;