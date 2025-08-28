// 表单验证工具函数

// 验证必填字段
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName}为必填项`;
  }
  return null;
};

// 验证权重值
export const validateWeight = (weight) => {
  if (!weight) return null;
  
  const numWeight = parseFloat(weight);
  if (isNaN(numWeight)) {
    return '权重必须为数字';
  }
  
  if (numWeight < 0 || numWeight > 100) {
    return '权重必须在0-100之间';
  }
  
  return null;
};

// 验证分数
export const validateScore = (score) => {
  if (!score) return null;
  
  const numScore = parseFloat(score);
  if (isNaN(numScore)) {
    return '分数必须为数字';
  }
  
  if (numScore < 0 || numScore > 100) {
    return '分数必须在0-100之间';
  }
  
  return null;
};

// 验证员工信息
export const validateEmployee = (employee) => {
  const errors = {};
  
  const nameError = validateRequired(employee.employeeName, '员工姓名');
  if (nameError) errors.employeeName = nameError;
  
  const idError = validateRequired(employee.employeeId, '员工ID');
  if (idError) errors.employeeId = idError;
  
  const deptError = validateRequired(employee.department, '部门');
  if (deptError) errors.department = deptError;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// 验证指标信息
export const validateIndicator = (indicator) => {
  const errors = {};
  
  const dimensionError = validateRequired(indicator.dimensionName, '维度名称');
  if (dimensionError) errors.dimensionName = dimensionError;
  
  const nameError = validateRequired(indicator.indicatorName, '指标名称');
  if (nameError) errors.indicatorName = nameError;
  
  const standardError = validateRequired(indicator.assessmentStandard, '考核标准');
  if (standardError) errors.assessmentStandard = standardError;
  
  const weightError = validateWeight(indicator.weight);
  if (weightError) errors.weight = weightError;
  
  const selfScoreError = validateScore(indicator.selfEvaluationResult);
  if (selfScoreError) errors.selfEvaluationResult = selfScoreError;
  
  const peerScoreError = validateScore(indicator.peerEvaluationResult);
  if (peerScoreError) errors.peerEvaluationResult = peerScoreError;
  
  const supervisorScoreError = validateScore(indicator.supervisorEvaluationResult);
  if (supervisorScoreError) errors.supervisorEvaluationResult = supervisorScoreError;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// 验证文件类型
export const validateFileType = (file, allowedTypes = ['.xlsx', '.xls']) => {
  if (!file) return '请选择文件';
  
  const fileName = file.name.toLowerCase();
  const isValidType = allowedTypes.some(type => fileName.endsWith(type));
  
  if (!isValidType) {
    return `只支持 ${allowedTypes.join(', ')} 格式的文件`;
  }
  
  return null;
};

// 验证文件大小
export const validateFileSize = (file, maxSizeMB = 10) => {
  if (!file) return '请选择文件';
  
  const fileSizeMB = file.size / 1024 / 1024;
  if (fileSizeMB > maxSizeMB) {
    return `文件大小不能超过 ${maxSizeMB}MB`;
  }
  
  return null;
};