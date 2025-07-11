import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Space, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Tag, 
  Modal,
  Statistic,
  Row,
  Col,
  message,
  Descriptions
} from 'antd';
import { 
  EyeOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  FileTextOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  TeamOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { SurveyService } from '../services/surveyService';
import { supabase, SURVEY_STATUS, TABLES } from '../lib/supabase';
import feishuAuth from '../services/feishuAuth';
import employeeAPI from '../services/employeeAPI';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [employeesModalVisible, setEmployeesModalVisible] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    employeeName: '',
    dateRange: []
  });

  useEffect(() => {
    fetchData();
    fetchStatistics();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const filterParams = {
        status: filters.status,
        employeeName: filters.employeeName
      };
      
      if (filters.dateRange && filters.dateRange.length === 2) {
        filterParams.dateFrom = filters.dateRange[0].format('YYYY-MM-DD');
        filterParams.dateTo = filters.dateRange[1].format('YYYY-MM-DD');
      }
      
      const data = await SurveyService.getSurveyResponses(filterParams);
      setResponses(data);
    } catch (error) {
      message.error('获取数据失败');
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await SurveyService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const showDetail = async (record) => {
    try {
      const detail = await SurveyService.getSurveyResponse(record.id);
      setSelectedResponse(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  // 同步飞书成员
  const syncMembers = async () => {
    setSyncLoading(true);
    try {
      const results = await employeeAPI.syncEmployees();
      
      // 格式化结果以适配现有UI
      const formattedResults = {
        success: results.success,
        total: results.stats?.totalUsers || 0,
        created: results.stats?.newUsers || 0,
        updated: results.stats?.updatedUsers || 0,
        errors: results.stats?.errors?.length || 0,
        errorDetails: results.stats?.errors || [],
        activeUsers: results.stats?.activeUsers || 0,
        inactiveUsers: results.stats?.inactiveUsers || 0,
        duplicateUsers: results.stats?.duplicateUsers || 0
      };
      
      setSyncResults(formattedResults);
      setSyncModalVisible(true);
      
      if (results.success && formattedResults.errors === 0) {
        message.success(`同步完成！新增 ${formattedResults.created} 人，更新 ${formattedResults.updated} 人`);
      } else if (results.success) {
        message.warning(`同步完成，但有 ${formattedResults.errors} 个错误，请查看详情`);
      } else {
        message.error(`同步失败: ${results.message}`);
      }
      
      // 刷新数据
      await fetchData();
    } catch (error) {
      console.error('同步成员失败:', error);
      message.error('同步失败: ' + error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  // 确认同步成员
  const confirmSyncMembers = () => {
    Modal.confirm({
      title: '确认同步成员列表',
      content: '此操作将从飞书获取最新的成员信息并同步到本地数据库。已存在的成员信息将被更新，新成员将被添加。确定要继续吗？',
      icon: <TeamOutlined />,
      okText: '确定同步',
      cancelText: '取消',
      onOk: syncMembers
    });
  };

  // 查看员工列表
  const viewEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const result = await employeeAPI.getEmployees({
        page: 1,
        limit: 100
      });
      
      if (result.success) {
        setEmployees(result.data || []);
        setEmployeesModalVisible(true);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('获取员工列表失败:', error);
      message.error('获取员工列表失败: ' + error.message);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // 验证后端API权限
  const validateApiPermissions = async () => {
    try {
      const result = await employeeAPI.validatePermissions();
      
      if (result.success) {
        message.success('API权限验证通过');
        console.log('API权限验证结果:', result);
      } else {
        message.error(`API权限验证失败: ${result.message}`);
        console.error('API权限验证失败:', result);
      }
    } catch (error) {
      console.error('验证API权限失败:', error);
      message.error('验证API权限失败: ' + error.message);
    }
  };

  // 检查后端服务健康状态
  const checkBackendHealth = async () => {
    try {
      const result = await employeeAPI.checkHealth();
      
      if (result.success) {
        message.success('后端服务正常');
        console.log('后端服务健康检查:', result);
      } else {
        message.error(`后端服务异常: ${result.message}`);
        console.error('后端服务异常:', result);
      }
    } catch (error) {
      console.error('后端服务检查失败:', error);
      message.error('后端服务检查失败: ' + error.message);
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      [SURVEY_STATUS.DRAFT]: { color: 'orange', text: '草稿' },
      [SURVEY_STATUS.SUBMITTED]: { color: 'blue', text: '已提交' },
      [SURVEY_STATUS.REVIEWED]: { color: 'green', text: '已审核' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: text => text.substring(0, 8) + '...'
    },
    {
      title: '员工姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 120
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 180,
      render: text => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: text => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  // 图表配置
  const getChartOption = () => {
    const dateStats = statistics.by_date || [];
    
    return {
      title: {
        text: '最近7天提交趋势',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dateStats.map(item => dayjs(item.date).format('MM-DD'))
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        name: '提交数量',
        type: 'line',
        data: dateStats.map(item => item.count),
        smooth: true,
        itemStyle: { color: '#1890ff' }
      }]
    };
  };

  const getDepartmentChartOption = () => {
    const deptStats = statistics.by_department || [];
    
    return {
      title: {
        text: '部门参与情况',
        left: 'center'
      },
      tooltip: {
        trigger: 'item'
      },
      series: [{
        name: '参与人数',
        type: 'pie',
        radius: '50%',
        data: deptStats.map(item => ({ name: item.name, value: item.count })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总提交数"
              value={statistics.total || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已提交"
              value={statistics.submitted || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="草稿"
              value={statistics.draft || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成率"
              value={statistics.completion_rate || 0}
              suffix="%"
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="提交趋势">
            <ReactECharts option={getChartOption()} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="部门分布">
            <ReactECharts option={getDepartmentChartOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* 问卷列表 */}
      <Card 
        title="问卷管理" 
        extra={
          <Space>
            <Button 
              onClick={checkBackendHealth}
              size="small"
              type="dashed"
            >
              检查后端
            </Button>
            <Button 
              onClick={validateApiPermissions}
              size="small"
              type="dashed"
            >
              验证权限
            </Button>
            <Button 
              icon={<TeamOutlined />}
              onClick={viewEmployees}
              loading={employeesLoading}
              type="default"
            >
              查看员工
            </Button>
            <Button 
              icon={<SyncOutlined />} 
              onClick={confirmSyncMembers}
              loading={syncLoading}
              type="primary"
            >
              同步成员列表
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 搜索筛选 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="员工姓名"
              value={filters.employeeName}
              onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })}
              style={{ width: 150 }}
            />
            <Select
              placeholder="状态"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: 120 }}
              allowClear
            >
              <Option value={SURVEY_STATUS.DRAFT}>草稿</Option>
              <Option value={SURVEY_STATUS.SUBMITTED}>已提交</Option>
              <Option value={SURVEY_STATUS.REVIEWED}>已审核</Option>
            </Select>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              format="YYYY-MM-DD"
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={fetchData}
            >
              搜索
            </Button>
          </Space>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={responses}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
          }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="问卷详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedResponse && (
          <div>
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="员工姓名">{selectedResponse.employee_name}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedResponse.user_id}</Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(selectedResponse.status)}</Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {selectedResponse.submitted_at ? 
                  dayjs(selectedResponse.submitted_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedResponse.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h3>问卷内容</h3>
              
              <Card title="绩效评估与反馈" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.performance_feedback || '（未填写）'}
                </p>
              </Card>

              <Card title="角色认知与团队价值" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.role_recognition || '（未填写）'}
                </p>
              </Card>

              <Card title="支持需求与资源" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.support_needs || '（未填写）'}
                </p>
              </Card>

              <Card title="下阶段标定与行动" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.next_phase_plan || '（未填写）'}
                </p>
              </Card>

              <Card title="线效反馈" style={{ marginBottom: 16 }}>
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.efficiency_feedback || '（未填写）'}
                </p>
              </Card>

              <Card title="总结">
                <p style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedResponse.summary || '（未填写）'}
                </p>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      {/* 同步结果模态框 */}
      <Modal
        title="同步成员列表结果"
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSyncModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {syncResults && (
          <div>
            <Descriptions title="同步统计" bordered column={2}>
              <Descriptions.Item label="总处理数">{syncResults.total}</Descriptions.Item>
              <Descriptions.Item label="新增成员">{syncResults.created}</Descriptions.Item>
              <Descriptions.Item label="更新成员">{syncResults.updated}</Descriptions.Item>
              <Descriptions.Item label="错误数量">{syncResults.errors}</Descriptions.Item>
            </Descriptions>
            
            {syncResults.errors > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>错误详情：</h4>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {syncResults.errorDetails.map((error, index) => (
                    <div key={index} style={{ 
                      background: '#fff2f0', 
                      border: '1px solid #ffccc7',
                      borderRadius: '4px',
                      padding: '8px',
                      marginBottom: '8px'
                    }}>
                      <p><strong>用户ID:</strong> {error.user_id}</p>
                      <p><strong>姓名:</strong> {error.name}</p>
                      <p><strong>错误:</strong> {error.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {syncResults.errors === 0 && (
              <div style={{ 
                marginTop: 16, 
                textAlign: 'center',
                color: '#52c41a'
              }}>
                <CheckCircleOutlined style={{ fontSize: 24, marginRight: 8 }} />
                同步完成，无错误！
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 员工列表模态框 */}
      <Modal
        title="员工列表"
        open={employeesModalVisible}
        onCancel={() => setEmployeesModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={employees}
          rowKey="id"
          loading={employeesLoading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 名员工`
          }}
          columns={[
            {
              title: '姓名',
              dataIndex: 'name',
              key: 'name',
              width: 100,
            },
            {
              title: '飞书ID',
              dataIndex: 'feishu_user_id',
              key: 'feishu_user_id',
              width: 120,
            },
            {
              title: '邮箱',
              dataIndex: 'email',
              key: 'email',
              width: 180,
            },
            {
              title: '手机',
              dataIndex: 'mobile',
              key: 'mobile',
              width: 120,
            },
            {
              title: '职位',
              dataIndex: 'job_title',
              key: 'job_title',
              width: 120,
            },
            {
              title: '状态',
              dataIndex: 'is_active',
              key: 'is_active',
              width: 80,
              render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                  {isActive ? '在职' : '离职'}
                </Tag>
              ),
            },
            {
              title: '最后同步',
              dataIndex: 'last_sync_time',
              key: 'last_sync_time',
              width: 140,
              render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default AdminDashboard;