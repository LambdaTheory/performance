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
  ClockCircleOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { SurveyService } from '../services/surveyService';
import { SURVEY_STATUS } from '../lib/supabase';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
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
      title: '工号',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 100
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
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
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
              <Descriptions.Item label="工号">{selectedResponse.employee_number}</Descriptions.Item>
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
    </div>
  );
};

export default AdminDashboard;