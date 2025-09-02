import React, { useState, useEffect, useMemo } from 'react';
import { 
  Spin, 
  Table, 
  message, 
  Select, 
  Card, 
  List, 
  Tag, 
  Modal, 
  Input, 
  Button 
} from 'antd';
import ReactECharts from 'echarts-for-react';
import { 
  UserOutlined,
  FileExcelOutlined
} from '@ant-design/icons';

const { Option } = Select;

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
  // 新增搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  // 360°评价数据
  const [review360Data, setReview360Data] = useState([]);

  useEffect(() => {
    fetchAllPerformanceData();
  }, []);

  // 获取所有绩效数据
  const fetchAllPerformanceData = async () => {
    try {
      setLoading(true);
      
      // 同时获取旧的绩效数据和新的360°评价数据
      const [performanceResponse, review360Response] = await Promise.all([
        fetch('http://localhost:3001/api/import/performance'),
        fetch('http://localhost:3001/api/performance360/employees')
      ]);
      
      const [performanceResult, review360Result] = await Promise.all([
        performanceResponse.json(),
        review360Response.json()
      ]);
      
      if (performanceResult.success) {
        // 员工绩效档案显示所有状态的数据
        const historyRecords = performanceResult.data.records || [];
        setAllPerformanceData(historyRecords);
        setAvailablePeriods(performanceResult.data.periods || []);
        
        // 如果360°评价数据获取成功，存储起来用于后续合并
        if (review360Result.success && review360Result.data) {
          setReview360Data(review360Result.data);
        }
        
        // 提取唯一员工列表
        const uniqueEmployees = [...new Map(
          performanceResult.data.records.map(record => [
            record.employeeName, 
            {
              name: record.employeeName,
              id: record.employeeId,
              department: record.department,
              totalRecords: [...new Set(
                performanceResult.data.records
                  .filter(r => r.employeeName === record.employeeName)
                  .map(r => r.evaluationPeriod)
                  .filter(Boolean)
              )].length
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

  // 新增：过滤员工列表的函数
  const filteredEmployeeList = useMemo(() => {
    if (!searchKeyword.trim()) {
      return employeeList;
    }
    
    return employeeList.filter(employee => 
      employee.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }, [employeeList, searchKeyword]);

  // 选择员工查看详情
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    
    // 获取基础绩效数据
    const employeeData = allPerformanceData.filter(record => record.employeeName === employee.name);
    
    // 获取360°评价数据
    const employee360Data = review360Data.find(emp => emp.name === employee.name);
    
    // 合并360°评价数据到绩效记录中
    const mergedData = employeeData.map(record => {
      // 直接使用员工级别的reviewers360数据
      const reviewers360 = employee360Data?.reviewers360 || [];
      
      if (employee360Data && employee360Data.records) {
        // 找到对应的360°评价记录
        const record360 = employee360Data.records.find(r => 
          r.evaluationPeriod === record.evaluationPeriod
        );
        
        if (record360) {
          // 合并360°评价人信息和评分数据
          return {
            ...record,
            reviewers360: reviewers360, // 使用员工级别的reviewers360
            // 合并360°评分数据
            ...Object.keys(record360).reduce((acc, key) => {
              if (key.startsWith('peerEvaluationResult_') || key.startsWith('peerEvaluationRemark_')) {
                acc[key] = record360[key];
              }
              return acc;
            }, {})
          };
        }
      }
      
      // 即使没有360记录，也添加reviewers360数据
      return {
        ...record,
        reviewers360: reviewers360
      };
    });
    
    setSelectedEmployeeData(mergedData);
    
    // 提取该员工实际存在数据的周期
    const employeePeriods = [...new Set(
      mergedData
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
          evaluationPeriod: period,
          importTime: record.importTime,
          importFile: record.importFile,
          evaluationForm: record.evaluationForm,
          reviewers360: record.reviewers360 || [], // 添加reviewers360数据
          indicators: []
        };
      }
      
      // 过滤有效指标
          if (record.indicatorName && 
              !record.indicatorName.includes('总分') && 
              !record.indicatorName.includes('总评') && 
              !record.indicatorName.includes('小计')) {
            // 构建包含所有360°评分字段的指标数据
            const indicatorData = {
              id: record.id,
              dimensionName: record.dimensionName,
              indicatorName: record.indicatorName,
              assessmentStandard: record.assessmentStandard,
              weight: record.weight,
              selfEvaluationResult: record.selfEvaluationResult,
              selfEvaluationRemark: record.selfEvaluationRemark,
              supervisorEvaluationResult: record.supervisorEvaluationResult,
              supervisorEvaluationRemark: record.supervisorEvaluationRemark,
              level: record.level,  // 添加绩效等级字段
              performanceResult: record.performanceResult  // 添加绩效结果字段
            };
            
            // 添加所有360°评分字段
            Object.keys(record).forEach(key => {
              if (key.startsWith('peerEvaluationResult_') || key.startsWith('peerEvaluationRemark_')) {
                indicatorData[key] = record[key];
              }
            });
            
            acc[period].indicators.push(indicatorData);
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

  // 处理查看详情
  const handleViewDetails = (record) => {
    // 将表格行数据转换为与图表点击相同的格式
    const chartPointData = {
      period: record.evaluationPeriod,
      level: record.indicators.find(indicator => 
        indicator.level && indicator.level.trim() !== ''
      )?.level || record.indicators[0]?.level || '暂无',
      data: record
    };
    setSelectedChartPoint(chartPointData);
    setChartDetailVisible(true);
  };

  // 员工详情表格列定义
  const indicatorColumns = [
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
    },

    {
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
    }
  ];

  // 历史绩效表格列定义
  const historyColumns = [
    {
      title: '考核名称',
      dataIndex: 'evaluationPeriod',
      key: 'evaluationPeriod',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '周期类型',
      dataIndex: 'cycleType',
      key: 'cycleType',
      width: 80,
      render: (text, record) => {
        const period = record.evaluationPeriod || '';
        if (period.includes('Q') || period.includes('季度')) {
          return '季度';
        } else if (period.includes('年') || period.includes('年度')) {
          return '年度';
        } else if (period.includes('月') || period.includes('月度')) {
          return '月度';
        }
        return '季度';
      }
    },
    {
      title: '考评表',
      dataIndex: 'evaluationForm',
      key: 'evaluationForm',
      width: 150,
      ellipsis: true,
      render: (text, record) => text || '员工季度绩效考核表'
    },
    {
      title: '结果',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (text, record) => {
        const levelIndicator = record.indicators.find(indicator => 
          indicator.level && indicator.level.trim() !== ''
        );
        const level = levelIndicator?.level || record.indicators[0]?.level || '暂无';
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
          <Tag color={colorMap[level] || 'default'}>
            {level}
          </Tag>
        );
      }
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 90,
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetails(record)}
        >
          查看详情
        </Button>
      )
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
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* 左侧员工列表 */}
        <div style={{ 
          width: '250px', 
          minWidth: '250px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>员工列表</h4>
              <span style={{ color: '#666', fontSize: '12px' }}>
                共 {filteredEmployeeList.length} 名员工
                {searchKeyword && ` (筛选自 ${employeeList.length} 名)`}
              </span>
            </div>
            {/* 新增搜索框 */}
            <Input
              placeholder="搜索员工姓名或部门"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </div>
          
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            {filteredEmployeeList.length > 0 ? (
              <List
                dataSource={filteredEmployeeList}
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
                        {/* 高亮搜索关键词 */}
                        {searchKeyword ? (
                          <span dangerouslySetInnerHTML={{
                            __html: employee.name.replace(
                              new RegExp(`(${searchKeyword})`, 'gi'),
                              '<mark style="background-color: #fffb8f; padding: 0;">$1</mark>'
                            )
                          }} />
                        ) : (
                          employee.name
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {/* 高亮部门名称中的搜索关键词 */}
                        {searchKeyword ? (
                          <span dangerouslySetInnerHTML={{
                            __html: employee.department.replace(
                              new RegExp(`(${searchKeyword})`, 'gi'),
                              '<mark style="background-color: #fffb8f; padding: 0;">$1</mark>'
                            )
                          }} />
                        ) : (
                          employee.department
                        )} | {employee.totalRecords} 条记录
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
                <p>{searchKeyword ? '未找到匹配的员工' : '暂无员工数据'}</p>
                {searchKeyword && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => setSearchKeyword('')}
                  >
                    清除搜索条件
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧员工详情 */}
        <div style={{ 
          flex: 1,
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #f0f0f0'
        }}>
          {selectedEmployee ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                      <span style={{ marginRight: '8px', color: '#666' }}>查看周期详情：</span>
                      <Select 
                        value={selectedPeriod} 
                        onChange={(period) => {
                          if (period === 'all') {
                            setSelectedPeriod('all');
                          } else {
                            // 找到对应周期的数据并弹出详情弹窗
                            const periodData = groupedEmployeeData.find(item => item.period === period);
                            if (periodData) {
                              const chartPointData = {
                                period: periodData.period,
                                level: periodData.indicators.find(indicator => 
                                  indicator.level && indicator.level.trim() !== ''
                                )?.level || periodData.indicators[0]?.level || '暂无',
                                data: periodData
                              };
                              setSelectedChartPoint(chartPointData);
                              setChartDetailVisible(true);
                            }
                            // 不更新selectedPeriod，保持下拉框显示"全部周期"
                          }
                        }}
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

              {/* 新增：绩效趋势图 */}
              {chartData.dates.length > 1 && (
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                      绩效趋势图
                    </h4>
                    
                    {/* 右上角统计数据 */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    textAlign: 'right'
                  }}>
                    {(() => {
                      const levelCounts = {};
                      const totalCount = chartData.levels.length;
                      
                      chartData.levels.forEach(level => {
                        const levelText = Object.keys(performanceLevelMap).find(key => performanceLevelMap[key] === level);
                        if (levelText) {
                          levelCounts[levelText] = (levelCounts[levelText] || 0) + 1;
                        }
                      });
                      
                      const sortedLevels = Object.entries(levelCounts)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 4);
                      
                      return sortedLevels.map(([level, count]) => (
                        <div key={level} style={{ 
                          fontSize: '12px', 
                          lineHeight: '1.4',
                          color: '#666'
                        }}>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>{level}</span>
                          <span style={{ marginLeft: '8px', color: '#999' }}>
                            {Math.round((count / totalCount) * 100)}% ({count}次)
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                  </div>
                  
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

              {/* 历史绩效表格 - 新的展示方式 */}
              <div style={{ padding: '20px' }}>
                {groupedEmployeeData.length > 0 ? (
                  <Table
                    columns={historyColumns}
                    dataSource={groupedEmployeeData.map((item, idx) => ({ ...item, key: idx }))}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      pageSizeOptions: [5, 10, 20, 50]
                    }}
                    size="middle"
                    bordered
                  />
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
      
      {/* 查看详情弹窗 - 参考正在考核页面的样式 */}
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
        width={1400}
        style={{ top: 20 }}
      >
        {selectedChartPoint && (
          <div>
            {/* 基本信息 */}
            <Card title="基本信息" size="small" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div><strong>考核周期：</strong>{selectedChartPoint.period}</div>
                <div><strong>绩效等级：</strong>{selectedChartPoint.level}</div>
                <div><strong>指标数量：</strong>{selectedChartPoint.data.indicators.length}</div>
                <div><strong>考评表：</strong>{selectedChartPoint.data.evaluationForm || '员工季度绩效考核表'}</div>
                <div><strong>导入文件：</strong>{selectedChartPoint.data.importFile || '-'}</div>
              </div>
            </Card>

            {/* 360°评价人信息 */}
            {(() => {
              const indicators = selectedChartPoint.data.indicators;
              const reviewers360 = selectedChartPoint.data.reviewers360 || [];
              
              // 优先使用reviewers360数据，或者从指标中提取并过滤员工自己
              let actualReviewers = [];
              
              if (reviewers360.length > 0) {
                actualReviewers = [...reviewers360];
              } else {
                // 从指标中提取并过滤员工自己
                const employeeName = selectedChartPoint.data.employeeName || selectedEmployee?.name;
                const peerReviewFields = [];
                indicators.forEach(indicator => {
                  Object.keys(indicator).forEach(key => {
                    if (key.startsWith('peerEvaluationResult_')) {
                      const reviewerName = key.replace('peerEvaluationResult_', '');
                      // 过滤掉员工自己的评分，只保留真正的评价人
                      if (reviewerName !== employeeName && !peerReviewFields.includes(reviewerName)) {
                        peerReviewFields.push(reviewerName);
                      }
                    }
                  });
                });
                actualReviewers = peerReviewFields;
              }
              
              if (actualReviewers.length > 0) {
                return (
                  <Card title="360°评价人" size="small" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {actualReviewers.map((reviewer, index) => (
                        <Tag 
                          key={index} 
                          color="blue" 
                          style={{ 
                            fontSize: '13px', 
                            padding: '4px 8px',
                            margin: 0
                          }}
                        >
                          {reviewer}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                );
              }
              
              return null;
            })()}

            {/* 绩效结果 */}
            <Card title="绩效结果" size="small" style={{ marginBottom: '16px' }}>
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
                    {selectedChartPoint.level}
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
                      const performanceResultIndicator = selectedChartPoint.data.indicators.find(indicator => 
                        indicator.performanceResult && indicator.performanceResult.trim() !== ''
                      );
                      
                      return performanceResultIndicator?.performanceResult || 
                        (selectedChartPoint.data.indicators[0]?.performanceResult || '暂无数据');
                    })()}
                  </div>
                </div>
              </div>
            </Card>
            
            {/* 指标详情 - 动态360°互评列 */}
            <Card title={`考核指标 (${selectedChartPoint.data.indicators.length}项)`} size="small">
              {(() => {
                // 分析360°互评数据，找出所有可能的互评字段
                const indicators = selectedChartPoint.data.indicators.map((item, idx) => ({ ...item, key: idx }));
                
                // 优先使用reviewers360数组中的评价人
                // 使用reviewers360中的评价人，这是正确的评价人列表
                let peerReviewFields = [];
                
                // 检查是否有reviewers360数据
                if (selectedChartPoint.data.reviewers360 && selectedChartPoint.data.reviewers360.length > 0) {
                  peerReviewFields = [...selectedChartPoint.data.reviewers360];
                } else {
                  // 如果没有reviewers360，从新的字段格式中提取评价人
                  indicators.forEach(indicator => {
                    Object.keys(indicator).forEach(key => {
                      if (key.startsWith('peerEvaluationResult_')) {
                        const reviewerName = key.replace('peerEvaluationResult_', '');
                        if (!peerReviewFields.includes(reviewerName)) {
                          peerReviewFields.push(reviewerName);
                        }
                      }
                    });
                  });
                }
                
                // 排序确保顺序一致
                peerReviewFields.sort();
                
                // 添加调试信息，显示实际评价人数量和字段匹配状态
                console.log('员工:', selectedChartPoint.data.name);
                console.log('评价人列表:', peerReviewFields);
                console.log('评价人数量:', peerReviewFields.length);
                
                // 验证每个评价人的字段是否存在
                peerReviewFields.forEach(reviewerName => {
                  const resultKey = `peerEvaluationResult_${reviewerName}`;
                  const remarkKey = `peerEvaluationRemark_${reviewerName}`;
                  const hasResult = indicators.some(indicator => indicator[resultKey] !== undefined);
                  const hasRemark = indicators.some(indicator => indicator[remarkKey] !== undefined);
                  console.log(`评价人 ${reviewerName}: 结果字段 ${resultKey} 存在=${hasResult}, 说明字段 ${remarkKey} 存在=${hasRemark}`);
                });
                
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
                if (peerReviewFields.length === 0) {
                  console.log('警告：没有找到360°评价人数据');
                }
                
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
                    tableLayout="auto"
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

export default EmployeeHistoryPerformance;