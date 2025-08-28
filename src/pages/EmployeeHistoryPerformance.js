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
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>员工列表</h4>
            {/* 新增搜索框 */}
            <Input
              placeholder="搜索员工姓名或部门"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ marginBottom: '8px' }}
              allowClear
            />
            <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>
              共 {filteredEmployeeList.length} 名员工
              {searchKeyword && ` (筛选自 ${employeeList.length} 名)`}
            </p>
          </div>
          
          <div style={{ height: 'calc(100% - 110px)', overflow: 'auto' }}>
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

export default EmployeeHistoryPerformance;