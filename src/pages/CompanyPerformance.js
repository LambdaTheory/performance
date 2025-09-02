import React, { useState, useEffect } from 'react';
import { Card, Table, Spin, message, Select, Row, Col, Button, Modal, Descriptions, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';

// 公司绩效组件
function CompanyPerformance() {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState([]);
  const [performanceTrends, setPerformanceTrends] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('全部周期');
  const [selectedForm, setSelectedForm] = useState('全部考评表');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchCompanyPerformanceData();
  }, []);

  const fetchCompanyPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/import/performance');
      const result = await response.json();
      
      if (result.success) {
        const records = result.data.records || [];
        
        // 提取所有周期和考评表
        const periods = [...new Set(records.map(record => record.evaluationPeriod).filter(Boolean))];
        const forms = [...new Set(records.map(record => record.evaluationForm || '员工季度绩效考核表').filter(Boolean))];
        
        setAvailablePeriods(['全部周期', ...periods]);
        setAvailableForms(['全部考评表', ...forms]);
        
        // 计算绩效趋势
        const trends = calculatePerformanceTrends(records);
        setPerformanceTrends(trends);
        
        setCompanyData(records);
      } else {
        message.error('获取公司绩效数据失败');
      }
    } catch (error) {
      console.error('获取公司绩效数据失败:', error);
      message.error('获取公司绩效数据失败');
    } finally {
      setLoading(false);
    }
  };





  const calculatePerformanceTrends = (records) => {
    const periodMap = {};
    const employeePeriodMap = {}; // 用于跟踪每个员工在每个周期的记录
    
    records.forEach(record => {
      if (!record.evaluationPeriod || !record.level || !record.employeeName) return;
      
      const periodKey = record.evaluationPeriod;
      const employeeKey = `${record.employeeName}`;
      const employeePeriodKey = `${employeeKey}_${periodKey}`;
      
      if (!periodMap[periodKey]) {
        periodMap[periodKey] = {
          period: periodKey,
          employees: new Set(),
          avgScore: 0,
          levelCounts: { 'O': 0, 'E': 0, 'M+': 0, 'M': 0, 'M-': 0, 'I': 0, 'F': 0 }
        };
      }
      
      // 确保每个员工在每个周期只统计一次绩效等级
      if (!employeePeriodMap[employeePeriodKey]) {
        periodMap[periodKey].employees.add(record.employeeName);
        
        // 只统计该员工在该周期的最终绩效等级
        if (periodMap[periodKey].levelCounts[record.level] !== undefined) {
          periodMap[periodKey].levelCounts[record.level]++;
        }
        
        employeePeriodMap[employeePeriodKey] = true;
      }
    });
    
    return Object.values(periodMap).map(period => {
      const levelMap = { 'O': 7, 'E': 6, 'M+': 5, 'M': 4, 'M-': 3, 'I': 2, 'F': 1 };
      let totalScore = 0;
      let totalCount = 0;
      
      Object.entries(period.levelCounts).forEach(([level, count]) => {
        totalScore += levelMap[level] * count;
        totalCount += count;
      });
      
      return {
        ...period,
        totalEmployees: period.employees.size,
        avgScore: totalCount > 0 ? (totalScore / totalCount).toFixed(2) : 0
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  };

  // 获取筛选后的数据
  const filteredData = companyData.filter(record => {
    const periodMatch = selectedPeriod === '全部周期' || record.evaluationPeriod === selectedPeriod;
    const formMatch = selectedForm === '全部考评表' || (record.evaluationForm || '员工季度绩效考核表') === selectedForm;
    return periodMatch && formMatch;
  });

  // 计算绩效等级分布数据（仅包含有数据的等级）
  const normalDistributionData = (() => {
    const levelCounts = {
      'O': 0, 'E': 0, 'M+': 0, 'M': 0, 'M-': 0, 'I': 0, 'F': 0
    };
    
    // 按员工和周期分组，确保每个员工在每个周期只统计一次
    const employeePeriodMap = {};
    
    filteredData.forEach(record => {
      if (!record.employeeName || !record.evaluationPeriod || !record.level) return;
      
      // 创建唯一的员工-周期标识
      const employeePeriodKey = `${record.employeeName}_${record.evaluationPeriod}`;
      
      // 如果这个员工在这个周期还没有被统计过
      if (!employeePeriodMap[employeePeriodKey] && levelCounts.hasOwnProperty(record.level)) {
        levelCounts[record.level]++;
        employeePeriodMap[employeePeriodKey] = true;
      }
    });
    
    // 只返回有数据的等级（count > 0）
    return Object.entries(levelCounts)
      .filter(([level, count]) => count > 0)
      .map(([level, count]) => ({
        level,
        count,
        name: {
          'O': '卓越',
          'E': '优秀',
          'M+': '良好+',
          'M': '良好',
          'M-': '良好-',
          'I': '待改进',
          'F': '不合格'
        }[level]
      }));
  })();



  // 判断是否应该更新绩效等级（保留较高等级）
  const shouldUpdateLevel = (newLevel, oldLevel) => {
    const levelPriority = { '暂无': -1, 'F': 0, 'I': 1, 'M-': 2, 'M': 3, 'M+': 4, 'E': 5, 'O': 6 };
    return levelPriority[newLevel] > levelPriority[oldLevel];
  };

  // 计算员工绩效数据（按员工汇总）
  const calculateEmployeeStats = () => {
    const employeeStats = {};
    
    // 按员工和周期分组，确保每个员工在每个周期只显示一条记录
    const employeePeriodMap = {};
    
    filteredData.forEach(record => {
      if (!record.employeeName || !record.evaluationPeriod) return;
      
      const employeeKey = `${record.employeeName}_${record.evaluationPeriod}`;
      const level = record.level || '暂无';
      
      // 如果这个员工在这个周期还没有记录，或者当前记录的等级更优先
      if (!employeePeriodMap[employeeKey] || shouldUpdateLevel(level, employeePeriodMap[employeeKey].level || '暂无')) {
        employeeStats[employeeKey] = {
          key: employeeKey,
          employeeName: record.employeeName,
          employeeId: record.employeeId || '未设置',
          department: record.department || '未分配部门',
          level: level,
          levelName: {
            'O': '卓越',
            'E': '优秀',
            'M+': '良好+',
            'M': '良好',
            'M-': '良好-',
            'I': '待改进',
            'F': '不合格',
            '暂无': '暂无'
          }[level] || '暂无',
          evaluationPeriod: record.evaluationPeriod,
          evaluationForm: record.evaluationForm || '员工季度绩效考核表',
          details: record // 保存完整记录用于详情查看
        };
        employeePeriodMap[employeeKey] = employeeStats[employeeKey];
      }
    });
    
    return Object.values(employeeStats);
  };

  const employeeStats = calculateEmployeeStats();

  // 查看员工详情
  const handleViewEmployeeDetail = (employee) => {
    setSelectedEmployee(employee);
    setDetailModalVisible(true);
  };

  // 关闭详情弹窗
  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedEmployee(null);
  };

  // 绩效等级分布饼状图配置
  const distributionChartOption = {
    title: {
      show: false // 隐藏标题
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      data: normalDistributionData.filter(item => item.count > 0).map(item => `${item.name}(${item.level})`)
    },
    series: [
      {
        name: '绩效等级',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{c}人\n{d}%',
          fontSize: 14,
          fontWeight: 'bold'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: normalDistributionData.map(item => ({
          value: item.count,
          name: `${item.name}(${item.level})`,
          itemStyle: {
            color: {
              'O': '#52c41a',
              'E': '#1890ff',
              'M+': '#13c2c2',
              'M': '#faad14',
              'M-': '#fa8c16',
              'I': '#f50',
              'F': '#ff4d4f'
            }[item.level]
          }
        }))
      }
    ]
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 公司绩效概览模块 */}
      <Card title="公司绩效概览" style={{ marginBottom: '24px' }}>
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col span={12}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>考核周期</div>
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: '100%' }}
              placeholder="选择考核周期"
            >
              {availablePeriods.map(period => (
                <Option key={period} value={period}>{period}</Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>考评表</div>
            <Select
              value={selectedForm}
              onChange={setSelectedForm}
              style={{ width: '100%' }}
              placeholder="选择考评表"
            >
              {availableForms.map(form => (
                <Option key={form} value={form}>{form}</Option>
              ))}
            </Select>
          </Col>
        </Row>
        
        {/* 绩效等级分布饼状图 */}
        <div style={{ height: '400px', marginTop: '24px' }}>
          {normalDistributionData.some(item => item.count > 0) ? (
            <ReactECharts
              option={distributionChartOption}
              style={{ height: '100%', width: '100%' }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '400px',
              color: '#999',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥧</div>
              <div>暂无数据</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                当前筛选条件下无绩效数据
              </div>
            </div>
          )}
        </div>
      </Card>



      {/* 员工绩效展示模块 - 按员工汇总的周期记录 */}
      <Card title={`员工绩效展示 - ${selectedPeriod}${selectedForm !== '全部考评表' ? ` - ${selectedForm}` : ''}`} style={{ marginTop: '24px' }}>
        <Table
          dataSource={employeeStats.map((record, index) => ({
            ...record,
            key: index
          }))}
          columns={[
            {
              title: '员工姓名',
              dataIndex: 'employeeName',
              key: 'employeeName',
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
              title: '考核周期',
              dataIndex: 'evaluationPeriod',
              key: 'evaluationPeriod',
              width: 120
            },
            {
              title: '考评表',
              dataIndex: 'evaluationForm',
              key: 'evaluationForm',
              width: 150
            },
            {
              title: '绩效等级',
              dataIndex: 'level',
              key: 'level',
              width: 100,
              render: (level) => {
                const levelName = level || '暂无';
                const colorMap = {
                  'O': '#52c41a',
                  'E': '#1890ff',
                  'M+': '#722ed1',
                  'M': '#13c2c2',
                  'M-': '#faad14',
                  'I': '#fa8c16',
                  'F': '#f5222d'
                };
                return (
                  <Tag color={colorMap[levelName] || 'default'}>
                    {levelName}
                  </Tag>
                );
              }
            },
            {
              title: '操作',
              dataIndex: 'action',
              key: 'action',
              width: 100,
              render: (text, record) => (
                <Button 
                  type="link" 
                  onClick={() => handleViewEmployeeDetail(record)}
                >
                  查看详情
                </Button>
              )
            }
          ]}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            pageSizeOptions: [10, 20, 50, 100]
          }}
          size="middle"
          rowKey="key"
          scroll={{ x: 800 }}
          bordered
        />
      </Card>

      {/* 员工详情弹窗 - 参考员工绩效档案实现 */}
      <Modal
        title={`${selectedEmployee?.employeeName || ''} - 绩效详情`}
        visible={detailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal}>
            关闭
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        {selectedEmployee && (
          <div>
            {/* 基本信息 */}
            <Card title="基本信息" size="small" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="员工姓名">
                  {selectedEmployee.employeeName}
                </Descriptions.Item>
                <Descriptions.Item label="工号">
                  {selectedEmployee.employeeId}
                </Descriptions.Item>
                <Descriptions.Item label="所属部门">
                  {selectedEmployee.department}
                </Descriptions.Item>
                <Descriptions.Item label="考核周期">
                  {selectedEmployee.evaluationPeriod}
                </Descriptions.Item>
                <Descriptions.Item label="考评表">
                  {selectedEmployee.evaluationForm}
                </Descriptions.Item>
                <Descriptions.Item label="绩效结果">
                  <span style={{ 
                    color: {
                      '卓越': '#52c41a',
                      '优秀': '#1890ff',
                      '良好+': '#13c2c2',
                      '良好': '#faad14',
                      '良好-': '#fa8c16',
                      '待改进': '#f50',
                      '不合格': '#ff4d4f'
                    }[selectedEmployee.levelName],
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {selectedEmployee.levelName}({selectedEmployee.level})
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 考核指标详情 - 动态360°互评列 */}
            <Card title="考核指标详情" size="small">
              {(() => {
                // 获取该员工在该周期的所有考核指标
                const employeeIndicators = companyData.filter(record => 
                  record.employeeName === selectedEmployee.employeeName && 
                  record.evaluationPeriod === selectedEmployee.evaluationPeriod
                );
                
                if (employeeIndicators.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                      暂无考核指标数据
                    </div>
                  );
                }
                
                // 分析360°互评数据，找出所有可能的互评字段
                const indicators = employeeIndicators.map((record, index) => ({ ...record, key: index }));
                
                // 收集所有360°互评相关的字段，优先使用reviewers360数据
                let peerReviewFields = [];
                
                // 获取员工姓名用于过滤
                const employeeName = selectedEmployee.employeeName;
                
                // 检查是否有reviewers360数据
                const employee360Record = companyData.find(record => 
                  record.employeeName === selectedEmployee.employeeName && 
                  record.evaluationPeriod === selectedEmployee.evaluationPeriod &&
                  record.reviewers360 && record.reviewers360.length > 0
                );
                
                if (employee360Record && employee360Record.reviewers360) {
                  // 优先使用reviewers360数据
                  peerReviewFields = [...employee360Record.reviewers360];
                } else {
                  // 如果没有reviewers360，从新的字段格式中提取评价人
                  if (employeeIndicators.length > 0) {
                    employeeIndicators.forEach(record => {
                      Object.keys(record).forEach(key => {
                        if (key.startsWith('peerEvaluationResult_')) {
                          const reviewerName = key.replace('peerEvaluationResult_', '');
                          // 过滤掉员工自己的评分，只保留真正的评价人
                          if (reviewerName !== employeeName && !peerReviewFields.includes(reviewerName)) {
                            peerReviewFields.push(reviewerName);
                          }
                        }
                      });
                    });
                  }
                }
                
                // 如果没有360°互评数据，添加一个默认的占位列
                if (peerReviewFields.length === 0) {
                  // 不再硬编码默认值，保持数组为空
                  // peerReviewFields.push('评价人');
                }
                
                // 排序确保顺序一致
                peerReviewFields.sort();
                
                // 构建动态列
                const dynamicColumns = [
                  {
                    title: '维度',
                    dataIndex: 'dimensionName',
                    key: 'dimensionName',
                    width: 100,
                    render: (text) => (
                      <div style={{ 
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5'
                      }}>
                        {text || '-'}
                      </div>
                    )
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
                        {text || '-'}
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
                        {text || '-'}
                      </div>
                    )
                  },
                  {
                    title: '权重',
                    dataIndex: 'weight',
                    key: 'weight',
                    width: 70,
                    render: (weight) => weight ? `${Math.round(weight * 100)}%` : '-'
                  },
                  {
                    title: '自评',
                    children: [
                      {
                        title: '结果',
                        dataIndex: 'selfEvaluationResult',
                        key: 'selfEvaluationResult',
                        width: 100,
                        render: (text) => text || '-'
                      },
                      {
                        title: '说明',
                        dataIndex: 'selfEvaluationRemark',
                        key: 'selfEvaluationRemark',
                        width: 140,
                        render: (text) => (
                          <div style={{ 
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.4'
                          }}>
                            {text || '-'}
                          </div>
                        )
                      }
                    ]
                  }
                ];
                
                // 添加动态360°互评列 - 使用新的字段名格式
                peerReviewFields.forEach((reviewerName, index) => {
                  // 使用新的字段名格式：peerEvaluationResult_评价人姓名 和 peerEvaluationRemark_评价人姓名
                  const resultKey = `peerEvaluationResult_${reviewerName}`;
                  const remarkKey = `peerEvaluationRemark_${reviewerName}`;
                  
                  dynamicColumns.push({
                    title: `360°互评-${reviewerName}`,
                    children: [
                      {
                        title: '结果',
                        dataIndex: resultKey,
                        key: resultKey,
                        width: 100,
                        render: (text, record) => {
                          return record[resultKey] || '-';
                        }
                      },
                      {
                        title: '说明',
                        dataIndex: remarkKey,
                        key: remarkKey,
                        width: 140,
                        render: (text, record) => {
                          return record[remarkKey] || '-';
                        }
                      }
                    ]
                  });
                });
                
                // 添加上级评分
                dynamicColumns.push({
                  title: '上级评分',
                  children: [
                    {
                      title: '结果',
                      dataIndex: 'supervisorEvaluationResult',
                      key: 'supervisorEvaluationResult',
                      width: 100,
                      render: (text) => text || '-'
                    },
                    {
                      title: '说明',
                      dataIndex: 'supervisorEvaluationRemark',
                      key: 'supervisorEvaluationRemark',
                      width: 140,
                      render: (text) => (
                        <div style={{ 
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4'
                        }}>
                          {text || '-'}
                        </div>
                      )
                    }
                  ]
                });
                
                // 计算表格宽度
                const tableWidth = 100 + 150 + 300 + 70 + 240 + // 基础列宽度
                  (peerReviewFields.length * 240) + 240; // 每个360°互评240px + 上级评分240px
                
                return (
                  <Table
                    columns={dynamicColumns}
                    dataSource={indicators}
                    pagination={false}
                    scroll={{ x: Math.max(1000, tableWidth) }}
                    size="small"
                    bordered
                  />
                );
              })()}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CompanyPerformance;