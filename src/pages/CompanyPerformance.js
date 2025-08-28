import React, { useState, useEffect } from 'react';
import { Card, Table, Spin, message } from 'antd';
import ReactECharts from 'echarts-for-react';

// 公司绩效组件
function CompanyPerformance() {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [performanceTrends, setPerformanceTrends] = useState([]);

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
        
        // 计算部门统计
        const deptStats = calculateDepartmentStats(records);
        setDepartmentStats(deptStats);
        
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

  const calculateDepartmentStats = (records) => {
    const deptMap = {};
    records.forEach(record => {
      if (!record.department || !record.level) return;
      
      if (!deptMap[record.department]) {
        deptMap[record.department] = {
          department: record.department,
          totalEmployees: new Set(),
          levelCounts: { 'O': 0, 'E': 0, 'M+': 0, 'M': 0, 'M-': 0, 'I': 0, 'F': 0 }
        };
      }
      
      deptMap[record.department].totalEmployees.add(record.employeeName);
      if (deptMap[record.department].levelCounts[record.level] !== undefined) {
        deptMap[record.department].levelCounts[record.level]++;
      }
    });
    
    return Object.values(deptMap).map(dept => ({
      ...dept,
      totalEmployees: dept.totalEmployees.size
    }));
  };

  const calculatePerformanceTrends = (records) => {
    const periodMap = {};
    records.forEach(record => {
      if (!record.evaluationPeriod || !record.level) return;
      
      if (!periodMap[record.evaluationPeriod]) {
        periodMap[record.evaluationPeriod] = {
          period: record.evaluationPeriod,
          employees: new Set(),
          avgScore: 0,
          levelCounts: { 'O': 0, 'E': 0, 'M+': 0, 'M': 0, 'M-': 0, 'I': 0, 'F': 0 }
        };
      }
      
      periodMap[record.evaluationPeriod].employees.add(record.employeeName);
      if (periodMap[record.evaluationPeriod].levelCounts[record.level] !== undefined) {
        periodMap[record.evaluationPeriod].levelCounts[record.level]++;
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

  // 部门绩效分布图表配置
  const departmentChartOption = {
    title: {
      text: '各部门绩效分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['卓越(O)', '优秀(E)', '良好+(M+)', '良好(M)', '良好-(M-)', '待改进(I)', '不合格(F)'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: departmentStats.map(dept => dept.department)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      { name: '卓越(O)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts.O), color: '#52c41a' },
      { name: '优秀(E)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts.E), color: '#1890ff' },
      { name: '良好+(M+)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts['M+']), color: '#13c2c2' },
      { name: '良好(M)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts.M), color: '#faad14' },
      { name: '良好-(M-)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts['M-']), color: '#fa8c16' },
      { name: '待改进(I)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts.I), color: '#f50' },
      { name: '不合格(F)', type: 'bar', stack: 'total', data: departmentStats.map(dept => dept.levelCounts.F), color: '#ff4d4f' }
    ]
  };

  // 绩效趋势图表配置
  const trendChartOption = {
    title: {
      text: '公司绩效趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['平均绩效分数', '参与人数'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: performanceTrends.map(trend => trend.period)
    },
    yAxis: [
      {
        type: 'value',
        name: '平均分数',
        min: 0,
        max: 7,
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: '人数',
        axisLabel: {
          formatter: '{value}人'
        }
      }
    ],
    series: [
      {
        name: '平均绩效分数',
        type: 'line',
        data: performanceTrends.map(trend => trend.avgScore),
        smooth: true,
        lineStyle: {
          color: '#1890ff'
        }
      },
      {
        name: '参与人数',
        type: 'bar',
        yAxisIndex: 1,
        data: performanceTrends.map(trend => trend.totalEmployees),
        itemStyle: {
          color: '#52c41a'
        }
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
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '8px' }}>公司绩效概览</h2>
        <p style={{ color: '#666', margin: 0 }}>查看公司整体绩效表现和部门对比分析</p>
      </div>

      {/* 统计卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              {departmentStats.reduce((sum, dept) => sum + dept.totalEmployees, 0)}
            </div>
            <div style={{ color: '#666' }}>总参与人数</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              {departmentStats.length}
            </div>
            <div style={{ color: '#666' }}>参与部门数</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
              {performanceTrends.length}
            </div>
            <div style={{ color: '#666' }}>考核周期数</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#13c2c2' }}>
              {performanceTrends.length > 0 ? 
                (performanceTrends.reduce((sum, trend) => sum + parseFloat(trend.avgScore), 0) / performanceTrends.length).toFixed(2) 
                : '0.00'
              }
            </div>
            <div style={{ color: '#666' }}>平均绩效分数</div>
          </div>
        </Card>
      </div>

      {/* 图表区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="部门绩效分布" style={{ height: '400px' }}>
          {departmentStats.length > 0 ? (
            <ReactECharts 
              option={departmentChartOption} 
              style={{ height: '320px' }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '320px',
              color: '#999'
            }}>
              暂无部门数据
            </div>
          )}
        </Card>
        
        <Card title="绩效趋势分析" style={{ height: '400px' }}>
          {performanceTrends.length > 0 ? (
            <ReactECharts 
              option={trendChartOption} 
              style={{ height: '320px' }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '320px',
              color: '#999'
            }}>
              暂无趋势数据
            </div>
          )}
        </Card>
      </div>

      {/* 部门详细统计表格 */}
      <Card title="部门绩效统计" style={{ marginTop: '24px' }}>
        <Table
          dataSource={departmentStats.map((dept, index) => ({ ...dept, key: index }))}
          columns={[
            { title: '部门', dataIndex: 'department', key: 'department' },
            { title: '总人数', dataIndex: 'totalEmployees', key: 'totalEmployees' },
            { title: '卓越(O)', dataIndex: ['levelCounts', 'O'], key: 'O' },
            { title: '优秀(E)', dataIndex: ['levelCounts', 'E'], key: 'E' },
            { title: '良好+(M+)', dataIndex: ['levelCounts', 'M+'], key: 'M+' },
            { title: '良好(M)', dataIndex: ['levelCounts', 'M'], key: 'M' },
            { title: '良好-(M-)', dataIndex: ['levelCounts', 'M-'], key: 'M-' },
            { title: '待改进(I)', dataIndex: ['levelCounts', 'I'], key: 'I' },
            { title: '不合格(F)', dataIndex: ['levelCounts', 'F'], key: 'F' }
          ]}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

export default CompanyPerformance;