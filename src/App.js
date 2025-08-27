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
  DeleteOutlined
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import './App.css';


const { Header, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { Dragger } = Upload;







// 在 MainApp 组件中更新菜单项
// 删除或注释掉 menuItems 数组，因为它引用了未定义的组件
// const menuItems = [
//   {
//     key: 'interview',
//     label: '面谈管理',
//     icon: <MessageOutlined />,
//     component: <InterviewSection />
//   },
//   {
//     key: 'todo',
//     label: '待办',
//     icon: <BellOutlined />,
//     component: <TodoSection />
//   }
// ];

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

// 本周期绩效组件
function CurrentPerformance() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [period, setPeriod] = useState('');
  const [summary, setSummary] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [indicatorEditModalVisible, setIndicatorEditModalVisible] = useState(false);
  const [selectedIndicatorIndex, setSelectedIndicatorIndex] = useState(null);
  const [operationMode, setOperationMode] = useState(null); // 'edit' 或 'delete'
  // 新增指标相关状态
  const [addIndicatorModalVisible, setAddIndicatorModalVisible] = useState(false);
  const [newIndicator, setNewIndicator] = useState(null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(''); // 移除默认的'all'值
  // 新增考核表相关状态
  const [availableEvaluationForms, setAvailableEvaluationForms] = useState([]);
  const [selectedEvaluationForm, setSelectedEvaluationForm] = useState('all');
  const [filteredPeriods, setFilteredPeriods] = useState([]);
  // 新增删除相关状态
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // 新增图表相关状态
  const [chartDetailVisible, setChartDetailVisible] = useState(false);
  const [selectedChartPoint, setSelectedChartPoint] = useState(null);
  // 新增导入功能相关状态
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importHistory, setImportHistory] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  
  // 绩效等级映射（从高到低）
  const performanceLevelMap = {
    'O': 7,
    'E': 6,
    'M+': 5,
    'M': 4,
    'M-': 3,
    'I': 2,
    'F': 1
  };

  useEffect(() => {
    fetchAllPerformance();
    fetchImportHistory(); // 新增：获取导入历史
  }, []);

  // 获取导入历史
  const fetchImportHistory = async () => {
    try {
      const response = await fetch('/api/import/history');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const formattedHistory = result.data.map(record => ({
            id: record.id,
            fileName: record.filename,
            periods: record.periods || ['未知周期'],
            importTime: new Date(record.importTime).toLocaleString(),
            status: record.status,
            recordCount: record.recordCount
          }));
          setImportHistory(formattedHistory.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('获取导入历史失败:', error);
    }
  };

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB！');
        return false;
      }
      setFile(file);
      
      setFilePreview({
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        estimatedRecords: '预计25条记录',
        detectedPeriods: ['2024-Q1', '2024-Q2']
      });
      
      return false;
    },
    onRemove: () => {
      setFile(null);
      setFilePreview(null);
    },
    fileList: file ? [file] : []
  };

  // 开始导入
  const handleImport = async () => {
    if (!file) {
      message.error('请选择要导入的Excel文件！');
      return;
    }

    setImporting(true);
    setUploadProgress(0);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
        message.success('导入成功！');
        
        await fetchImportHistory();
        await fetchAllPerformance(); // 刷新绩效数据
        
        setFile(null);
        setFilePreview(null);
      } else {
        throw new Error('导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请检查文件格式和网络连接');
      
      setImportResults({
        success: false,
        message: '导入失败',
        error: error.message
      });
    } finally {
      setImporting(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const fetchAllPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/import/performance');
      const result = await response.json();
      
      if (result.success) {
        setPerformanceData(result.data.records || []);
        
        // 提取所有可用的考核周期
        const periods = result.data.periods || [];
        setAvailablePeriods(periods);
        
        // 提取所有可用的考核表并去重
        const evaluationForms = [...new Set(
          (result.data.records || []).map(record => record.evaluationForm).filter(Boolean)
        )];
        setAvailableEvaluationForms(evaluationForms);
        
        // 默认选择第一个考核表（如果存在）
        if (evaluationForms.length > 0) {
          setSelectedEvaluationForm(evaluationForms[0]);
          // 根据选择的考核表筛选周期
          const formPeriods = [...new Set(
            (result.data.records || [])
              .filter(record => record.evaluationForm === evaluationForms[0])
              .map(record => record.evaluationPeriod)
              .filter(Boolean)
          )];
          setFilteredPeriods(formPeriods);
          setSelectedPeriod(formPeriods.length > 0 ? formPeriods[0] : '');
        } else {
          setFilteredPeriods(periods);
          setSelectedPeriod(periods.length > 0 ? periods[0] : '');
        }
        
        setSummary({
          totalRecords: result.data.totalRecords || 0,
          totalEmployees: result.data.summary?.totalEmployees || 0,
          totalPeriods: result.data.summary?.totalPeriods || 0,
          latestImport: result.data.summary?.latestImport || ''
        });
      } else {
        message.error('获取绩效数据失败');
      }
    } catch (error) {
      console.error('获取绩效数据失败:', error);
      message.error('获取绩效数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加删除员工绩效记录的函数
  const handleDeleteEmployee = (employee) => {
    setDeletingEmployee(employee);
    setDeleteModalVisible(true);
  };

  // 确认删除员工绩效记录
  const confirmDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    try {
      setDeleteLoading(true);
      const response = await fetch(`http://localhost:3001/api/import/performance/employee/${deletingEmployee.employeeName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          evaluationForm: deletingEmployee.evaluationForm,
          evaluationPeriod: deletingEmployee.evaluationPeriod
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('绩效记录删除成功');
        setDeleteModalVisible(false);
        setDeletingEmployee(null);
        // 重新加载数据
        fetchAllPerformance();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除绩效记录失败:', error);
      message.error('删除绩效记录失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 编辑员工基本信息
  const handleEditEmployee = (employee) => {
    setEditingEmployee({ ...employee });
    setEditModalVisible(true);
  };

  // 保存员工基本信息
  const handleSaveEmployee = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/import/performance/employee/${encodeURIComponent(editingEmployee.employeeName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingEmployee)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('保存成功');
        setEditModalVisible(false);
        setEditingEmployee(null);
        fetchLatestPerformance(); // 重新加载数据
        // 重新获取数据以更新详情弹窗
        fetchAllPerformance();
        if (detailModalVisible) {
          const updatedEmployee = groupedData.find(emp => emp.employeeName === editingEmployee.employeeName);
          setSelectedEmployee(updatedEmployee);
        }
      } else {
        message.error('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存员工信息失败:', error);
      message.error('保存失败');
    }
  };

  // 编辑指标
  const handleEditIndicator = (indicator) => {
    // 将小数权重转换为百分比显示
    const weightAsPercentage = indicator.weight ? Math.round(indicator.weight * 100) : '';
    setEditingIndicator({ 
      ...indicator, 
      weight: weightAsPercentage // 转换为百分比数值
    });
    setIndicatorEditModalVisible(true);
  };

  // 保存指标
  const handleSaveIndicator = async () => {
    try {
      // 验证必填字段
      if (!editingIndicator.dimensionName?.trim()) {
        message.error('维度名称为必填项');
        return;
      }
      if (!editingIndicator.indicatorName?.trim()) {
        message.error('指标名称为必填项');
        return;
      }
      if (!editingIndicator.assessmentStandard?.trim()) {
        message.error('考核标准为必填项');
        return;
      }

      // 将百分比转换回小数格式保存
      const indicatorToSave = {
        ...editingIndicator,
        weight: editingIndicator.weight ? parseFloat(editingIndicator.weight) / 100 : null
      };
      
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${editingIndicator.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(indicatorToSave)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('保存成功');
        setIndicatorEditModalVisible(false);
        setEditingIndicator(null);
        fetchAllPerformance(); // 重新加载数据
        // 更新详情弹窗中的员工信息
        if (detailModalVisible && selectedEmployee) {
          const updatedEmployee = groupedData.find(emp => emp.employeeName === selectedEmployee.employeeName);
          setSelectedEmployee(updatedEmployee);
        }
      } else {
        message.error('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存指标失败:', error);
      message.error('保存失败');
    }
  };

  // 删除指标
  const handleDeleteIndicator = async (indicatorId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${indicatorId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('删除成功');
        fetchAllPerformance(); // 重新加载数据
        // 更新详情弹窗中的员工信息
        if (detailModalVisible && selectedEmployee) {
          const updatedEmployee = groupedData.find(emp => emp.employeeName === selectedEmployee.employeeName);
          setSelectedEmployee(updatedEmployee);
        }
      } else {
        message.error('删除失败：' + result.message);
      }
    } catch (error) {
      console.error('删除指标失败:', error);
      message.error('删除失败');
    }
  };

  // 新增指标
  const handleAddIndicator = () => {
    if (!selectedEmployee) {
      message.error('请先选择员工');
      return;
    }
    
    // 初始化新指标数据
    setNewIndicator({
      dimensionName: '',
      indicatorName: '',
      assessmentStandard: '',
      weight: '',
      selfEvaluationResult: '',
      peerEvaluationResult: '',
      supervisorEvaluationResult: '',
      // 继承员工基本信息
      employeeName: selectedEmployee.employeeName,
      employeeId: selectedEmployee.employeeId,
      department: selectedEmployee.department,
      evaluationForm: selectedEmployee.evaluationForm,
      evaluationPeriod: selectedEmployee.evaluationPeriod,
      currentNode: selectedEmployee.currentNode
    });
    setAddIndicatorModalVisible(true);
  };

  // 保存新增指标
  const handleSaveNewIndicator = async () => {
    try {
      // 验证必填字段
      if (!newIndicator.dimensionName?.trim()) {
        message.error('维度名称为必填项');
        return;
      }
      if (!newIndicator.indicatorName?.trim()) {
        message.error('指标名称为必填项');
        return;
      }
      if (!newIndicator.assessmentStandard?.trim()) {
        message.error('考核标准为必填项');
        return;
      }

      // 将百分比转换回小数格式保存
      const indicatorToSave = {
        ...newIndicator,
        weight: newIndicator.weight ? parseFloat(newIndicator.weight) / 100 : null
      };
      
      const response = await fetch('http://localhost:3001/api/import/performance/indicator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(indicatorToSave)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('新增指标成功');
        setAddIndicatorModalVisible(false);
        setNewIndicator(null);
        fetchAllPerformance(); // 重新加载数据
        // 更新详情弹窗中的员工信息
        if (detailModalVisible && selectedEmployee) {
          const updatedEmployee = groupedData.find(emp => emp.employeeName === selectedEmployee.employeeName);
          setSelectedEmployee(updatedEmployee);
        }
      } else {
        message.error('新增指标失败：' + result.message);
      }
    } catch (error) {
      console.error('新增指标失败:', error);
      message.error('新增指标失败');
    }
  };

  // 处理考核表选择变化
  const handleEvaluationFormChange = (formValue) => {
    setSelectedEvaluationForm(formValue);
    
    if (formValue === 'all') {
      // 选择全部考核表时，显示所有周期
      setFilteredPeriods(availablePeriods);
      setSelectedPeriod(availablePeriods.length > 0 ? availablePeriods[0] : '');
    } else {
      // 根据选择的考核表筛选对应的周期
      const formPeriods = [...new Set(
        performanceData
          .filter(record => record.evaluationForm === formValue)
          .map(record => record.evaluationPeriod)
          .filter(Boolean)
      )];
      setFilteredPeriods(formPeriods);
      setSelectedPeriod(formPeriods.length > 0 ? formPeriods[0] : '');
    }
  };

  // 根据选择的考核表和周期过滤数据
  const filteredData = useMemo(() => {
    if (!performanceData || performanceData.length === 0) return [];
    
    return performanceData.filter(item => {
      // 考核表筛选
      const formMatch = selectedEvaluationForm === 'all' || item.evaluationForm === selectedEvaluationForm;
      // 周期筛选
      const periodMatch = !selectedPeriod || item.evaluationPeriod === selectedPeriod;
      
      return formMatch && periodMatch;
    });
  }, [performanceData, selectedEvaluationForm, selectedPeriod]);

  // 数据分组逻辑：按员工姓名分组
  const groupedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const grouped = filteredData.reduce((acc, item) => {
      const key = item.employeeName;
      if (!acc[key]) {
        acc[key] = {
          employeeName: item.employeeName,
          employeeId: item.employeeId,
          department: item.department,
          evaluationForm: item.evaluationForm,
          evaluationPeriod: item.evaluationPeriod,
          currentNode: item.currentNode,
          indicators: []
        };
      }
      
      // 添加指标信息时过滤无用数据
        if (item.indicatorName && 
            !item.indicatorName.includes('总分') && 
            !item.indicatorName.includes('总评') && 
            !item.indicatorName.includes('小计')) {
          acc[key].indicators.push({
            id: item.id,
            dimensionName: item.dimensionName,
            indicatorName: item.indicatorName,
            assessmentStandard: item.assessmentStandard,
            weight: item.weight,
            selfEvaluationResult: item.selfEvaluationResult,
            peerEvaluationResult: item.peerEvaluationResult,
            supervisorEvaluationResult: item.supervisorEvaluationResult,
            level: item.level,  // 添加绩效等级字段
            performanceResult: item.performanceResult,  // 添加绩效结果字段
            rawRowIndex: item.rawRowIndex
          });
        }
      
      return acc;
    }, {});
    
    return Object.values(grouped);
  }, [filteredData]);

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      fixed: 'left',
      width: 120
    },
    {
      title: '工号',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 100
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120
    },
    {
      title: '考评表',
      dataIndex: 'evaluationForm',
      key: 'evaluationForm',
      width: 150,
      ellipsis: true
    },
    {
      title: '考核周期',
      dataIndex: 'evaluationPeriod',
      key: 'evaluationPeriod',
      width: 120
    },
    {
      title: '当前节点',
      dataIndex: 'currentNode',
      key: 'currentNode',
      width: 120
    },
    {
      title: '指标数量',
      key: 'indicatorCount',
      width: 100,
      render: (_, record) => (
        <Tag color="blue">{record.indicators.length}</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => {
              setSelectedEmployee(record);
              setDetailModalVisible(true);
            }}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteEmployee(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>加载绩效数据中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 新增：顶部导入功能区域 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px' }}>数据导入</h3>
          <p style={{ color: '#666', margin: 0 }}>上传Excel文件，系统将自动识别考核周期并导入员工绩效数据</p>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          {/* 左侧：导入区域 */}
          <div style={{ flex: 2 }}>
            <Card title="数据导入" size="small" style={{ height: '547px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Dragger {...uploadProps} style={{ padding: '20px' }}>
                  <p className="ant-upload-drag-icon">
                    <FileExcelOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                  </p>
                  <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持.xlsx和.xls格式，文件大小不超过10MB<br/>
                    系统将自动识别文件中的考核周期信息
                  </p>
                </Dragger>
              </div>

              {filePreview && (
                <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f6ffed' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#52c41a' }}>文件信息预览</h4>
                  <div style={{ fontSize: '14px' }}>
                    <p><strong>文件名：</strong>{filePreview.fileName}</p>
                    <p><strong>文件大小：</strong>{filePreview.fileSize}</p>
                  </div>
                </Card>
              )}

              {uploadProgress > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Progress 
                    percent={uploadProgress} 
                    status={importing ? 'active' : 'success'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              )}

              <Button 
                type="primary" 
                size="large"
                icon={<UploadOutlined />}
                onClick={handleImport}
                loading={importing}
                disabled={!file}
                style={{ width: '100%' }}
              >
                {importing ? '正在解析并导入数据...' : '开始导入'}
              </Button>
            </Card>

            {/* 导入结果 */}
            {importResults && (
              <Card title="导入结果" style={{ marginTop: '16px' }} size="small">
                {importResults.success ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                      <CheckOutlined style={{ color: '#52c41a', fontSize: '20px', marginRight: '8px' }} />
                      <span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                        {importResults.message}
                      </span>
                    </div>
                    
                    {importResults.detectedPeriods && (
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>检测到的考核周期：</p>
                        {importResults.detectedPeriods.map(period => (
                          <Tag key={period} color="blue" style={{ marginRight: '8px' }}>{period}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                      <CloseOutlined style={{ color: '#ff4d4f', fontSize: '20px', marginRight: '8px' }} />
                      <span style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>
                        {importResults.message}
                      </span>
                    </div>
                    {importResults.error && (
                      <p style={{ color: '#666', margin: 0 }}>错误详情：{importResults.error}</p>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* 右侧：导入历史 */}
          <div style={{ flex: 1 }}>
            <Card 
              title="导入历史" 
              size="small"
              style={{ height: '547px' }}
              styles={{ 
                body: { 
                  height: '467px',
                  overflow: 'auto', 
                  display: 'flex', 
                  alignItems: importHistory.length > 0 ? 'flex-start' : 'center', 
                  justifyContent: importHistory.length > 0 ? 'flex-start' : 'center',
                  padding: '16px'
                }
              }}
            >
              {importHistory.length > 0 ? (
                <List
                  size="small"
                  dataSource={importHistory}
                  style={{ width: '100%' }}
                  renderItem={(item) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>{item.fileName}</span>
                          <Tag color={item.status === 'success' ? 'green' : 'red'} style={{ marginLeft: '3px' }}>
                            {item.status === 'success' ? '成功' : '失败'}
                          </Tag>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          <div>周期：
                            {item.periods.map(period => (
                              <Tag key={period} size="small" color="blue" style={{ marginLeft: '4px' }}>
                                {period}
                              </Tag>
                            ))}
                          </div>
                          <div>时间：{item.importTime}</div>
                          <div>记录数：{item.recordCount}</div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999' }}>
                  <FileExcelOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
                  <p>暂无导入历史</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div style={{ borderTop: '1px solid #f0f0f0', margin: '24px 0' }}></div>

      {/* 原本周期绩效功能区域 */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '8px' }}>本周期绩效管理</h3>
          <p style={{ color: '#666', margin: 0 }}>查看和管理当前考核周期的员工绩效数据</p>
        </div>

        {/* 数据概览和筛选 */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px',
          padding: '16px',
          background: '#f5f5f5',
          borderRadius: '8px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* 考核表选择 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>考核表：</span>
              <Select 
                value={selectedEvaluationForm} 
                onChange={handleEvaluationFormChange}
                style={{ minWidth: 180 }}
              >
                <Option value="all">全部考核表</Option>
                {availableEvaluationForms.map(form => (
                  <Option key={form} value={form}>{form}</Option>
                ))}
              </Select>
            </div>
            
            {/* 考核周期选择 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>考核周期：</span>
              <Select 
                value={selectedPeriod} 
                onChange={setSelectedPeriod}
                style={{ minWidth: 150 }}
                disabled={filteredPeriods.length === 0}
              >
                {filteredPeriods.map(period => (
                  <Option key={period} value={period}>{period}</Option>
                ))}
              </Select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>员工数量：</span>
              <strong>{groupedData.length}</strong>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <Space>
            <Button onClick={fetchAllPerformance} loading={loading}>
              刷新数据
            </Button>
            <Button type="primary" disabled={groupedData.length === 0}>
              导出数据
            </Button>
          </Space>
        </div>
      </div>

      <div>
        {/* 数据表格 */}
        {groupedData.length > 0 ? (
          <Table
            columns={columns}
            dataSource={groupedData.map((item, index) => ({ ...item, key: index }))}
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 名员工`
            }}
            bordered
            size="middle"
          />
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9'
          }}>
            <FileExcelOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <h4 style={{ color: '#999' }}>暂无绩效数据</h4>
            <p style={{ color: '#999' }}>请先在上方"数据导入"区域导入Excel绩效文件</p>
          </div>
        )}
      </div>

      {/* 员工详情弹窗 */}
      <Modal
        title={selectedEmployee?.employeeName + ' - 绩效详情'}
        visible={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setOperationMode(null);
          setSelectedIndicatorIndex(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setOperationMode(null);
            setSelectedIndicatorIndex(null);
          }}>
            关闭
          </Button>
        ]}
        width={1400}
        style={{ top: 20 }}
      >
        {selectedEmployee && (
          <div>
            {/* 员工基本信息 */}
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>基本信息</span>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => handleEditEmployee(selectedEmployee)}
                  >
                    编辑信息
                  </Button>
                </div>
              } 
              size="small" 
              style={{ marginBottom: '16px' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div><strong>姓名：</strong>{selectedEmployee.employeeName}</div>
                <div><strong>工号：</strong>{selectedEmployee.employeeId || '-'}</div>
                <div><strong>部门：</strong>{selectedEmployee.department}</div>
                <div><strong>考评表：</strong>{selectedEmployee.evaluationForm}</div>
                <div><strong>考核周期：</strong>{selectedEmployee.evaluationPeriod}</div>
                <div><strong>当前节点：</strong>{selectedEmployee.currentNode}</div>
              </div>
            </Card>

            {/* 新增：绩效结果模块 */}
            <Card 
              title="绩效结果" 
              size="small" 
              style={{ marginBottom: '16px' }}
            >
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* 绩效等级 */}
                <div style={{ minWidth: '200px' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '500', color: '#666' }}>
                    绩效等级
                  </div>
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#f6f6f6', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {selectedEmployee.indicators[0]?.level || '暂无数据'}
                  </div>
                </div>
                
                {/* 绩效结果 */}
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ marginBottom: '8px', fontWeight: '500', color: '#666' }}>
                      绩效结果
                    </div>
                    <div style={{ 
                          padding: '8px 12px', 
                          background: '#f6f6f6', 
                          borderRadius: '4px',
                          fontSize: '14px',
                          minHeight: '32px',
                          whiteSpace: 'pre-wrap'
                        }}>
                        {(() => {
                          const performanceResultIndicator = selectedEmployee.indicators.find(indicator => 
                            indicator.performanceResult && indicator.performanceResult.trim() !== ''
                          );
                          
                          return performanceResultIndicator?.performanceResult || 
                            (selectedEmployee.indicators[0]?.performanceResult || '暂无数据');
                        })()}
                      </div>
                  </div>
              </div>
            </Card>

            {/* 考核指标详情 */}
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{`考核指标 (${selectedEmployee.indicators.length}项)`}</span>
                  <Space>
                    <Button 
                      type="primary"
                      size="small"
                      onClick={handleAddIndicator}
                    >
                      新增指标
                    </Button>
                    <Button 
                      type={operationMode === 'edit' ? 'primary' : 'default'}
                      size="small"
                      onClick={() => {
                        if (operationMode === 'edit') {
                          setOperationMode(null);
                          setSelectedIndicatorIndex(null);
                        } else {
                          setOperationMode('edit');
                          setSelectedIndicatorIndex(null);
                          message.info('请点击要编辑的指标行');
                        }
                      }}
                    >
                      {operationMode === 'edit' ? '取消编辑' : '编辑指标'}
                    </Button>
                    <Button 
                      type={operationMode === 'delete' ? 'primary' : 'default'}
                      danger={operationMode !== 'delete'}
                      size="small"
                      onClick={() => {
                        if (operationMode === 'delete') {
                          setOperationMode(null);
                          setSelectedIndicatorIndex(null);
                        } else {
                          setOperationMode('delete');
                          setSelectedIndicatorIndex(null);
                          message.info('请点击要删除的指标行');
                        }
                      }}
                    >
                      {operationMode === 'delete' ? '取消删除' : '删除指标'}
                    </Button>
                  </Space>
                </div>
              } 
              size="small"
            >
              {operationMode && (
                <div style={{ 
                  padding: '8px 16px', 
                  marginBottom: '16px', 
                  backgroundColor: operationMode === 'edit' ? '#e6f7ff' : '#fff2e8',
                  border: `1px solid ${operationMode === 'edit' ? '#91d5ff' : '#ffbb96'}`,
                  borderRadius: '4px'
                }}>
                  <span style={{ color: operationMode === 'edit' ? '#1890ff' : '#fa8c16' }}>
                    {operationMode === 'edit' ? '📝 编辑模式：请点击要编辑的指标行' : '🗑️ 删除模式：请点击要删除的指标行'}
                  </span>
                </div>
              )}
              <Table
                dataSource={selectedEmployee.indicators.map((item, index) => ({ ...item, key: index }))}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'dimensionName',
                    key: 'dimensionName',
                    width: 100
                  },
                  {
                    title: '指标名称',
                    dataIndex: 'indicatorName',
                    key: 'indicatorName',
                    width: 150,
                    render: (text) => (
                      <div style={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        {text}
                      </div>
                    )
                  },
                  {
                    title: '考核标准',
                    dataIndex: 'assessmentStandard',
                    key: 'assessmentStandard',
                    width: 300,
                    render: (text) => (
                      <div style={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5',
                        padding: '8px 0'
                      }}>
                        {text}
                      </div>
                    )
                  },
                  {
                    title: '权重',
                    dataIndex: 'weight',
                    key: 'weight',
                    width: 80,
                    render: (weight) => {
                      if (!weight) return '-';
                      // 将小数转换为百分比显示
                      const percentage = Math.round(weight * 100);
                      return `${percentage}%`;
                    }
                  },
                  {
                    title: '自评',
                    dataIndex: 'selfEvaluationResult',
                    key: 'selfEvaluationResult',
                    width: 80
                  },
                  {
                    title: '360°互评',
                    dataIndex: 'peerEvaluationResult',
                    key: 'peerEvaluationResult',
                    width: 100
                  },
                  {
                    title: '上级评分',
                    dataIndex: 'supervisorEvaluationResult',
                    key: 'supervisorEvaluationResult',
                    width: 100
                  }
                ]}
                pagination={false}
                size="small"
                tableLayout="fixed"
                onRow={(record, index) => ({
                  onClick: () => {
                    if (operationMode === 'edit') {
                      handleEditIndicator(selectedEmployee.indicators[index]);
                      setOperationMode(null);
                      setSelectedIndicatorIndex(null);
                    } else if (operationMode === 'delete') {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除指标"${record.indicatorName}"吗？`,
                        onOk: () => {
                          handleDeleteIndicator(record.id);
                          setOperationMode(null);
                          setSelectedIndicatorIndex(null);
                        },
                        onCancel: () => {
                          setOperationMode(null);
                          setSelectedIndicatorIndex(null);
                        }
                      });
                    }
                  },
                  style: {
                    cursor: operationMode ? 'pointer' : 'default',
                    backgroundColor: operationMode && selectedIndicatorIndex === index ? 
                      (operationMode === 'edit' ? '#e6f7ff' : '#fff2e8') : 'transparent',
                    transition: 'background-color 0.2s'
                  },
                  onMouseEnter: (e) => {
                    if (operationMode) {
                      e.currentTarget.style.backgroundColor = operationMode === 'edit' ? '#f0f9ff' : '#fef7f0';
                    }
                  },
                  onMouseLeave: (e) => {
                    if (operationMode && selectedIndicatorIndex !== index) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }
                })}
                style={{
                  '.ant-table-tbody > tr > td': {
                    verticalAlign: 'top'
                  }
                }}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* 新增指标弹窗 */}
      <Modal
        title="新增指标"
        open={addIndicatorModalVisible}
        onOk={handleSaveNewIndicator}
        onCancel={() => {
          setAddIndicatorModalVisible(false);
          setNewIndicator(null);
        }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        {newIndicator && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label><strong>维度名称：<span style={{color: 'red'}}>*</span></strong></label>
              <input 
                type="text" 
                value={newIndicator.dimensionName} 
                onChange={(e) => setNewIndicator({...newIndicator, dimensionName: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入维度名称"
              />
            </div>
            <div>
              <label><strong>指标名称：<span style={{color: 'red'}}>*</span></strong></label>
              <input 
                type="text" 
                value={newIndicator.indicatorName} 
                onChange={(e) => setNewIndicator({...newIndicator, indicatorName: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入指标名称"
              />
            </div>
            <div>
              <label><strong>考核标准：<span style={{color: 'red'}}>*</span></strong></label>
              <textarea 
                value={newIndicator.assessmentStandard} 
                onChange={(e) => setNewIndicator({...newIndicator, assessmentStandard: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  resize: 'vertical',
                  minHeight: '80px',
                  maxHeight: '300px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  overflow: 'auto'
                }}
                onInput={(e) => {
                  // 自动调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                }}
                onFocus={(e) => {
                  // 聚焦时也调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                }}
                placeholder="请输入考核标准..."
              />
            </div>
            <div>
              <label><strong>权重(%)：</strong></label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                value={newIndicator.weight || ''} 
                onChange={(e) => setNewIndicator({...newIndicator, weight: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入权重百分比（如：40）"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label><strong>自评：</strong></label>
                <input 
                  type="text" 
                  value={newIndicator.selfEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
              <div>
                <label><strong>360°互评：</strong></label>
                <input 
                  type="text" 
                  value={newIndicator.peerEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
              <div>
                <label><strong>上级评分：</strong></label>
                <input 
                  type="text" 
                  value={newIndicator.supervisorEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={confirmDeleteEmployee}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingEmployee(null);
        }}
        confirmLoading={deleteLoading}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除以下员工的绩效记录吗？此操作不可撤销。</p>
        {deletingEmployee && (
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: '4px',
            marginTop: '12px'
          }}>
            <p><strong>员工姓名：</strong>{deletingEmployee.employeeName}</p>
            <p><strong>考核表：</strong>{deletingEmployee.evaluationForm}</p>
            <p><strong>考核周期：</strong>{deletingEmployee.evaluationPeriod}</p>
            <p><strong>指标数量：</strong>{deletingEmployee.indicators?.length || 0}</p>
          </div>
        )}
      </Modal>

      {/* 编辑员工信息弹窗 */}
      <Modal
        title="编辑员工信息"
        visible={editModalVisible}
        onOk={handleSaveEmployee}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingEmployee(null);
        }}
        width={600}
      >
        {editingEmployee && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label><strong>员工姓名：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.employeeName} 
                onChange={(e) => setEditingEmployee({...editingEmployee, employeeName: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label><strong>工号：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.employeeId || ''} 
                onChange={(e) => setEditingEmployee({...editingEmployee, employeeId: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label><strong>部门：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.department} 
                onChange={(e) => setEditingEmployee({...editingEmployee, department: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label><strong>考评表：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.evaluationForm} 
                onChange={(e) => setEditingEmployee({...editingEmployee, evaluationForm: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label><strong>考核周期：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.evaluationPeriod} 
                onChange={(e) => setEditingEmployee({...editingEmployee, evaluationPeriod: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label><strong>当前节点：</strong></label>
              <input 
                type="text" 
                value={editingEmployee.currentNode} 
                onChange={(e) => setEditingEmployee({...editingEmployee, currentNode: e.target.value})}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑指标弹窗 */}
      <Modal
        title="编辑指标"
        visible={indicatorEditModalVisible}
        onOk={handleSaveIndicator}
        onCancel={() => {
          setIndicatorEditModalVisible(false);
          setEditingIndicator(null);
        }}
        width={800}
      >
        {editingIndicator && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div>
              <label><strong>维度名称：<span style={{color: 'red'}}>*</span></strong></label>
              <input 
                type="text" 
                value={editingIndicator.dimensionName} 
                onChange={(e) => setEditingIndicator({...editingIndicator, dimensionName: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入维度名称"
              />
            </div>
            <div>
              <label><strong>指标名称：<span style={{color: 'red'}}>*</span></strong></label>
              <input 
                type="text" 
                value={editingIndicator.indicatorName} 
                onChange={(e) => setEditingIndicator({...editingIndicator, indicatorName: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入指标名称"
              />
            </div>
            <div>
              <label><strong>考核标准：<span style={{color: 'red'}}>*</span></strong></label>
              <textarea 
                value={editingIndicator.assessmentStandard} 
                onChange={(e) => setEditingIndicator({...editingIndicator, assessmentStandard: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  resize: 'vertical',
                  minHeight: '80px',
                  maxHeight: '300px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  overflow: 'auto'
                }}
                onInput={(e) => {
                  // 自动调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                }}
                onFocus={(e) => {
                  // 聚焦时也调整高度
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                }}
                placeholder="请输入考核标准..."
              />
            </div>
            <div>
              <label><strong>权重(%)：</strong></label>
              <input 
                type="number" 
                min="0"
                max="100"
                step="1"
                value={editingIndicator.weight || ''} 
                onChange={(e) => setEditingIndicator({...editingIndicator, weight: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '4px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px'
                }}
                placeholder="请输入权重百分比（如：40）"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label><strong>自评：</strong></label>
                <input 
                  type="text" 
                  value={editingIndicator.selfEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
              <div>
                <label><strong>360°互评：</strong></label>
                <input 
                  type="text" 
                  value={editingIndicator.peerEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
              <div>
                <label><strong>上级评分：</strong></label>
                <input 
                  type="text" 
                  value={editingIndicator.supervisorEvaluationResult || ''} 
                  readOnly
                  disabled
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginTop: '4px', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                    color: '#999',
                    cursor: 'not-allowed'
                  }}
                  placeholder="评分内容不可编辑"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// 员工历史绩效组件
function EmployeeHistoryPerformance() {
  // 绩效等级到数值的映射（用于图表显示）
  const performanceLevelMap = {
    'O': 7,    // 卓越
    'E': 6,    // 优秀
    'M+': 5,   // 良好+
    'M': 4,    // 良好
    'M-': 3,   // 良好-
    'I': 2,    // 待改进
    'F': 1     // 不合格
  };

  const [loading, setLoading] = useState(true);
  const [allPerformanceData, setAllPerformanceData] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeData, setSelectedEmployeeData] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [employeeAvailablePeriods, setEmployeeAvailablePeriods] = useState([]);
  // 新增图表相关状态
  const [chartDetailVisible, setChartDetailVisible] = useState(false);
  const [selectedChartPoint, setSelectedChartPoint] = useState(null);

  useEffect(() => {
    fetchAllPerformanceData();
  }, []);

  // 获取所有绩效数据
  const fetchAllPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/import/performance');
      const result = await response.json();
      
      if (result.success) {
        setAllPerformanceData(result.data.records || []);
        setAvailablePeriods(result.data.periods || []);
        
        // 提取唯一员工列表
        const uniqueEmployees = [...new Map(
          result.data.records.map(record => [
            record.employeeName, 
            {
              name: record.employeeName,
              id: record.employeeId,
              department: record.department,
              // 修改：只统计有效指标记录，过滤掉总分、总评、小计
              totalRecords: result.data.records.filter(r => 
                r.employeeName === record.employeeName &&
                r.indicatorName && 
                !r.indicatorName.includes('总分') && 
                !r.indicatorName.includes('总评') && 
                !r.indicatorName.includes('小计')
              ).length
            }
          ])
        ).values()];
        
        setEmployeeList(uniqueEmployees.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        message.error('获取绩效数据失败');
      }
    } catch (error) {
      console.error('获取绩效数据失败:', error);
      message.error('获取绩效数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择员工查看详情
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    const employeeData = allPerformanceData.filter(record => record.employeeName === employee.name);
    setSelectedEmployeeData(employeeData);
    
    // 提取该员工实际存在数据的周期
    const employeePeriods = [...new Set(
      employeeData
        .map(record => record.evaluationPeriod)
        .filter(Boolean)
    )].sort();
    
    setEmployeeAvailablePeriods(employeePeriods);
    setSelectedPeriod('all');
  };

  // 过滤选中员工的数据
  const filteredEmployeeData = useMemo(() => {
    if (!selectedEmployeeData.length) return [];
    if (selectedPeriod === 'all') return selectedEmployeeData;
    return selectedEmployeeData.filter(record => record.evaluationPeriod === selectedPeriod);
  }, [selectedEmployeeData, selectedPeriod]);

  // 按考核周期分组员工数据
  const groupedEmployeeData = useMemo(() => {
    if (!filteredEmployeeData.length) return [];
    
    const grouped = filteredEmployeeData.reduce((acc, record) => {
      const period = record.evaluationPeriod || '未知周期';
      if (!acc[period]) {
        acc[period] = {
          period,
          importTime: record.importTime,
          importFile: record.importFile,
          indicators: []
        };
      }
      
      // 过滤有效指标
      if (record.indicatorName && 
          !record.indicatorName.includes('总分') && 
          !record.indicatorName.includes('总评') && 
          !record.indicatorName.includes('小计')) {
        acc[period].indicators.push({
          id: record.id,
          dimensionName: record.dimensionName,
          indicatorName: record.indicatorName,
          assessmentStandard: record.assessmentStandard,
          weight: record.weight,
          selfEvaluationResult: record.selfEvaluationResult,
          peerEvaluationResult: record.peerEvaluationResult,
          supervisorEvaluationResult: record.supervisorEvaluationResult,
          level: record.level,  // 添加绩效等级字段
          performanceResult: record.performanceResult  // 添加绩效结果字段
        });
      }
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => new Date(a.importTime) - new Date(b.importTime));
  }, [filteredEmployeeData]);

  // 准备折线图数据
  const chartData = useMemo(() => {
    if (!groupedEmployeeData.length) return { dates: [], levels: [], rawData: [] };
    
    const data = groupedEmployeeData.map(periodData => {
      // 获取该周期的主要绩效等级
      const levelIndicator = periodData.indicators.find(indicator => 
        indicator.level && indicator.level.trim() !== ''
      );
      const level = levelIndicator?.level || periodData.indicators[0]?.level || 'I';
      
      return {
        period: periodData.period,
        level: level,
        levelValue: performanceLevelMap[level] || 2,
        data: periodData
      };
    }).sort((a, b) => new Date(a.period) - new Date(b.period));
    
    return {
      dates: data.map(item => item.period),
      levels: data.map(item => item.levelValue),
      rawData: data
    };
  }, [groupedEmployeeData, performanceLevelMap]);

  // ECharts 配置
  const chartOption = useMemo(() => {
    if (chartData.dates.length < 2) return {};
    
    return {
      title: {
        text: `${selectedEmployee?.name || ''} 绩效趋势图`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          const rawData = chartData.rawData[params.dataIndex];
          const levelText = Object.keys(performanceLevelMap).find(key => performanceLevelMap[key] === params.value[1]);
          return `
            <div style="padding: 8px;">
              <div><strong>考核周期：</strong>${params.value[0]}</div>
              <div><strong>绩效等级：</strong>${levelText}</div>
              <div><strong>指标数量：</strong>${rawData.data.indicators.length}</div>
              <div style="margin-top: 8px; color: #666; font-size: 12px;">点击查看详细内容</div>
            </div>
          `;
        }
      },
      grid: {
        left: '12%',
        right: '8%',
        bottom: '18%',
        top: '22%'
      },
      xAxis: {
        type: 'category',
        data: chartData.dates,
        axisLabel: {
          rotate: 0,
          fontSize: 12,
          margin: 10
        },
        name: '考核周期',
        nameLocation: 'end',
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          color: '#666'
        },
        nameGap: 15
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 8,
        interval: 1,
        axisLabel: {
          formatter: function(value) {
            const levelText = Object.keys(performanceLevelMap).find(key => performanceLevelMap[key] === value);
            return levelText || '';
          }
        },
        name: '绩效等级',
        nameLocation: 'end',
        nameTextStyle: {
          fontSize: 13,
          fontWeight: 'bold',
          color: '#666'
        },
        nameGap: 15
      },
      series: [{
        name: '绩效等级',
        type: 'line',
        data: chartData.dates.map((date, index) => [date, chartData.levels[index]]),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff',
          borderWidth: 2,
          borderColor: '#fff'
        },
        emphasis: {
          itemStyle: {
            color: '#ff4d4f',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(255, 77, 79, 0.3)'
          }
        }
      }]
    };
  }, [chartData, selectedEmployee, performanceLevelMap]);

  // 处理图表点击事件
  const handleChartClick = (params) => {
    if (params.componentType === 'series') {
      const clickedData = chartData.rawData[params.dataIndex];
      setSelectedChartPoint(clickedData);
      setChartDetailVisible(true);
    }
  };

  // 员工详情表格列定义
  const indicatorColumns = [
    {
      title: '维度',
      dataIndex: 'dimensionName',
      key: 'dimensionName',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '指标名称',
      dataIndex: 'indicatorName',
      key: 'indicatorName',
      width: 200,
      ellipsis: true
    },
    {
      title: '考核标准',
      dataIndex: 'assessmentStandard',
      key: 'assessmentStandard',
      width: 250,
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
      render: (weight) => weight ? `${Math.round(weight * 100)}%` : '-'
    },
    {
      title: '自评',
      dataIndex: 'selfEvaluationResult',
      key: 'selfEvaluationResult',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '360°互评',
      dataIndex: 'peerEvaluationResult',
      key: 'peerEvaluationResult',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '上级评分',
      dataIndex: 'supervisorEvaluationResult',
      key: 'supervisorEvaluationResult',
      width: 120,
      render: (text) => text || '-'
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>加载员工数据中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', height: '100%' }}>
      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* 左侧员工列表 */}
        <div style={{ 
          width: '300px', 
          minWidth: '300px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px' }}>员工列表</h4>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '12px' }}>
              共 {employeeList.length} 名员工
            </p>
          </div>
          
          <div style={{ height: 'calc(100% - 70px)', overflow: 'auto' }}>
            {employeeList.length > 0 ? (
              <List
                dataSource={employeeList}
                renderItem={(employee) => (
                  <List.Item
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f5f5f5',
                      background: selectedEmployee?.name === employee.name ? '#e6f7ff' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleEmployeeSelect(employee)}
                    onMouseEnter={(e) => {
                      if (selectedEmployee?.name !== employee.name) {
                        e.target.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedEmployee?.name !== employee.name) {
                        e.target.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ 
                        fontWeight: selectedEmployee?.name === employee.name ? 'bold' : 'normal',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {employee.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {employee.department} | {employee.totalRecords} 条记录
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center', 
                color: '#999' 
              }}>
                <UserOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
                <p>暂无员工数据</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧员工详情 */}
        <div style={{ 
          flex: 1,
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          overflow: 'hidden'
        }}>
          {selectedEmployee ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 员工信息头部 */}
              <div style={{ 
                padding: '20px', 
                borderBottom: '1px solid #f0f0f0',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>
                      {selectedEmployee.name} - 历史绩效
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                      工号：{selectedEmployee.id} | 部门：{selectedEmployee.department}
                    </p>
                  </div>
                  
                  {employeeAvailablePeriods.length > 1 && (
                    <div>
                      <span style={{ marginRight: '8px', color: '#666' }}>筛选周期：</span>
                      <Select 
                        value={selectedPeriod} 
                        onChange={setSelectedPeriod}
                        style={{ minWidth: 150 }}
                      >
                        <Option value="all">全部周期</Option>
                        {employeeAvailablePeriods.map(period => (
                          <Option key={period} value={period}>{period}</Option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* 新增：绩效结果模块 - 仅在选择具体周期时显示 */}
              {groupedEmployeeData.length > 0 && selectedPeriod !== 'all' && (
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fff'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
                    绩效结果
                  </h4>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* 绩效等级 */}
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ marginBottom: '8px', fontWeight: '500', color: '#666' }}>
                        绩效等级
                      </div>
                      <div style={{ 
                        padding: '8px 12px', 
                        background: '#f6f6f6', 
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {(() => {
                          const levelIndicator = groupedEmployeeData[0]?.indicators.find(indicator => 
                            indicator.level && indicator.level.trim() !== ''
                          );
                          return levelIndicator?.level || (groupedEmployeeData[0]?.indicators[0]?.level || '暂无数据');
                        })()}
                      </div>
                    </div>
                    
                    {/* 绩效结果 */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      <div style={{ marginBottom: '8px', fontWeight: '500', color: '#666' }}>
                        绩效结果
                      </div>
                      <div style={{ 
                        padding: '8px 12px', 
                        background: '#f6f6f6', 
                        borderRadius: '4px',
                        fontSize: '14px',
                        minHeight: '32px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {(() => {
                          const performanceResultIndicator = groupedEmployeeData[0]?.indicators.find(indicator => 
                            indicator.performanceResult && indicator.performanceResult.trim() !== ''
                          );
                          return performanceResultIndicator?.performanceResult || 
                            (groupedEmployeeData[0]?.indicators[0]?.performanceResult || '暂无数据');
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 新增：绩效趋势图 */}
              {chartData.dates.length > 1 && (
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fff'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
                    绩效趋势图
                  </h4>
                  <div style={{ height: '400px' }}>
                    <ReactECharts
                      option={chartOption}
                      style={{ height: '100%', width: '100%' }}
                      onEvents={{
                        'click': handleChartClick
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 绩效数据内容 - 仅在选择具体周期时显示 */}
              {selectedPeriod !== 'all' && (
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                  {groupedEmployeeData.length > 0 ? (
                    <div>
                      {groupedEmployeeData.map((periodData, index) => (
                        <Card
                          key={periodData.period}
                          title={(
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{periodData.period}</span>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                <span>数据来源：{periodData.importFile}</span>
                                <span style={{ marginLeft: '16px' }}>
                                  导入时间：{new Date(periodData.importTime).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                          style={{ marginBottom: index < groupedEmployeeData.length - 1 ? '16px' : 0 }}
                          size="small"
                        >
                          <div style={{ marginBottom: '12px' }}>
                            <Tag color="blue">指标数量：{periodData.indicators.length}</Tag>
                            <Tag color="green">
                              总权重：{periodData.indicators.reduce((sum, item) => sum + (item.weight || 0), 0)}%
                            </Tag>
                          </div>
                          
                          <Table
                            columns={indicatorColumns}
                            dataSource={periodData.indicators.map((item, idx) => ({ ...item, key: idx }))}
                            pagination={false}
                            scroll={{ x: 1000 }}
                            size="small"
                            bordered
                          />
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '60px',
                      color: '#999'
                    }}>
                      <FileExcelOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <h4>暂无绩效数据</h4>
                      <p>该员工在选定周期内暂无绩效记录</p>
                    </div>
                  )}
                </div>
              )}

              {/* 全部周期模式下的占位内容 */}
              {selectedPeriod === 'all' && chartData.dates.length <= 1 && (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#999',
                  padding: '60px'
                }}>
                  <FileExcelOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <h4>数据不足</h4>
                  <p>需要至少2个周期的数据才能显示趋势图</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#999'
            }}>
              <UserOutlined style={{ fontSize: '64px', marginBottom: '20px' }} />
              <h3 style={{ color: '#999' }}>请选择员工</h3>
              <p>点击左侧员工列表中的员工姓名查看详细历史绩效</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 图表点击详情弹窗 */}
      <Modal
        title={`${selectedChartPoint?.period || ''} - 绩效详情`}
        open={chartDetailVisible}
        onCancel={() => {
          setChartDetailVisible(false);
          setSelectedChartPoint(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setChartDetailVisible(false);
            setSelectedChartPoint(null);
          }}>
            关闭
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        {selectedChartPoint && (
          <div>
            {/* 基本信息 */}
            <Card title="基本信息" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div><strong>考核周期：</strong>{selectedChartPoint.period}</div>
                <div><strong>绩效等级：</strong>{selectedChartPoint.level}</div>
                <div><strong>指标数量：</strong>{selectedChartPoint.data.indicators.length}</div>
                <div><strong>导入时间：</strong>{new Date(selectedChartPoint.data.importTime).toLocaleString()}</div>
              </div>
            </Card>
            
            {/* 指标详情 */}
            <Card title="考核指标详情" size="small">
              <Table
                columns={indicatorColumns}
                dataSource={selectedChartPoint.data.indicators.map((item, idx) => ({ ...item, key: idx }))}
                pagination={false}
                scroll={{ x: 1000 }}
                size="small"
                bordered
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

// 考核板块组件
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
      label: '员工历史绩效',
      children: <EmployeeHistoryPerformance />
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
