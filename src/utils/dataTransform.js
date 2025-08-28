// 数据转换工具函数

// 按员工分组绩效数据
export const groupDataByEmployee = (data) => {
  if (!data || !Array.isArray(data)) return [];
  
  const grouped = data.reduce((acc, record) => {
    const key = record.employeeName;
    if (!acc[key]) {
      acc[key] = {
        employeeName: record.employeeName,
        employeeId: record.employeeId,
        department: record.department,
        evaluationForm: record.evaluationForm,
        evaluationPeriod: record.evaluationPeriod,
        currentNode: record.currentNode,
        indicators: []
      };
    }
    
    // 添加指标信息
    acc[key].indicators.push({
      id: record.id,
      dimensionName: record.dimensionName,
      indicatorName: record.indicatorName,
      assessmentStandard: record.assessmentStandard,
      weight: record.weight,
      selfEvaluationResult: record.selfEvaluationResult,
      peerEvaluationResult: record.peerEvaluationResult,
      supervisorEvaluationResult: record.supervisorEvaluationResult
    });
    
    return acc;
  }, {});
  
  return Object.values(grouped);
};

// 过滤数据
export const filterData = (data, filters) => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.filter(record => {
    // 按考核表过滤
    if (filters.evaluationForm && filters.evaluationForm !== 'all') {
      if (record.evaluationForm !== filters.evaluationForm) return false;
    }
    
    // 按考核周期过滤
    if (filters.period && filters.period !== 'all') {
      if (record.evaluationPeriod !== filters.period) return false;
    }
    
    // 按部门过滤
    if (filters.department && filters.department !== 'all') {
      if (record.department !== filters.department) return false;
    }
    
    // 按状态过滤
    if (filters.status && filters.status !== 'all') {
      if (record.currentNode !== filters.status) return false;
    }
    
    return true;
  });
};

// 提取唯一值
export const extractUniqueValues = (data, field) => {
  if (!data || !Array.isArray(data)) return [];
  return [...new Set(data.map(record => record[field]).filter(Boolean))];
};

// 计算统计信息
export const calculateStatistics = (data) => {
  if (!data || !Array.isArray(data)) {
    return {
      totalRecords: 0,
      totalEmployees: 0,
      totalDepartments: 0,
      totalPeriods: 0
    };
  }
  
  const employees = extractUniqueValues(data, 'employeeName');
  const departments = extractUniqueValues(data, 'department');
  const periods = extractUniqueValues(data, 'evaluationPeriod');
  
  return {
    totalRecords: data.length,
    totalEmployees: employees.length,
    totalDepartments: departments.length,
    totalPeriods: periods.length
  };
};

// 转换表格数据
export const transformTableData = (groupedData) => {
  if (!groupedData || !Array.isArray(groupedData)) return [];
  
  return groupedData.map((employee, index) => ({
    key: employee.employeeName,
    index: index + 1,
    employeeName: employee.employeeName,
    employeeId: employee.employeeId,
    department: employee.department,
    evaluationForm: employee.evaluationForm,
    evaluationPeriod: employee.evaluationPeriod,
    currentNode: employee.currentNode,
    indicatorCount: employee.indicators?.length || 0,
    completedCount: employee.indicators?.filter(ind => 
      ind.selfEvaluationResult || ind.peerEvaluationResult || ind.supervisorEvaluationResult
    ).length || 0,
    employee: employee // 保留完整的员工数据
  }));
};

// 导出Excel数据格式转换
export const transformForExport = (data) => {
  if (!data || !Array.isArray(data)) return [];
  
  const exportData = [];
  
  data.forEach(employee => {
    if (employee.indicators && employee.indicators.length > 0) {
      employee.indicators.forEach(indicator => {
        exportData.push({
          '员工姓名': employee.employeeName,
          '员工ID': employee.employeeId,
          '部门': employee.department,
          '考核表': employee.evaluationForm,
          '考核周期': employee.evaluationPeriod,
          '当前节点': employee.currentNode,
          '维度名称': indicator.dimensionName,
          '指标名称': indicator.indicatorName,
          '考核标准': indicator.assessmentStandard,
          '权重': indicator.weight ? (indicator.weight * 100).toFixed(1) + '%' : '',
          '自评结果': indicator.selfEvaluationResult,
          '互评结果': indicator.peerEvaluationResult,
          '上级评分': indicator.supervisorEvaluationResult
        });
      });
    } else {
      // 没有指标的员工也要导出基本信息
      exportData.push({
        '员工姓名': employee.employeeName,
        '员工ID': employee.employeeId,
        '部门': employee.department,
        '考核表': employee.evaluationForm,
        '考核周期': employee.evaluationPeriod,
        '当前节点': employee.currentNode,
        '维度名称': '',
        '指标名称': '',
        '考核标准': '',
        '权重': '',
        '自评结果': '',
        '互评结果': '',
        '上级评分': ''
      });
    }
  });
  
  return exportData;
};