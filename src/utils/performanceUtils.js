// 绩效相关工具函数

// 格式化日期
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// 格式化日期时间
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 计算权重百分比显示
export const formatWeight = (weight) => {
  if (!weight) return '';
  return Math.round(weight * 100) + '%';
};

// 将百分比转换为小数
export const parseWeight = (weightPercent) => {
  if (!weightPercent) return null;
  return parseFloat(weightPercent) / 100;
};

// 获取绩效等级颜色
export const getPerformanceColor = (level) => {
  const colorMap = {
    'O': '#52c41a', // 绿色
    'E': '#1890ff', // 蓝色
    'M+': '#13c2c2', // 青色
    'M': '#faad14', // 橙色
    'M-': '#fa8c16', // 深橙色
    'I': '#f5222d', // 红色
    'F': '#a8071a'  // 深红色
  };
  return colorMap[level] || '#d9d9d9';
};

// 获取绩效等级描述
export const getPerformanceDescription = (level) => {
  const descMap = {
    'O': '卓越',
    'E': '优秀',
    'M+': '良好+',
    'M': '良好',
    'M-': '良好-',
    'I': '待改进',
    'F': '不合格'
  };
  return descMap[level] || level;
};

// 计算总权重
export const calculateTotalWeight = (indicators) => {
  if (!indicators || !Array.isArray(indicators)) return 0;
  return indicators.reduce((total, indicator) => {
    return total + (indicator.weight || 0);
  }, 0);
};

// 验证权重总和是否为100%
export const validateWeightSum = (indicators) => {
  const total = calculateTotalWeight(indicators);
  return Math.abs(total - 1) < 0.01; // 允许1%的误差
};

// 生成员工绩效摘要
export const generatePerformanceSummary = (employee) => {
  if (!employee || !employee.indicators) {
    return {
      totalIndicators: 0,
      completedIndicators: 0,
      averageScore: 0,
      overallLevel: 'N/A'
    };
  }

  const indicators = employee.indicators;
  const totalIndicators = indicators.length;
  const completedIndicators = indicators.filter(ind => 
    ind.selfEvaluationResult || ind.peerEvaluationResult || ind.supervisorEvaluationResult
  ).length;

  // 计算平均分数（基于上级评分）
  const validScores = indicators
    .map(ind => parseFloat(ind.supervisorEvaluationResult))
    .filter(score => !isNaN(score));
  
  const averageScore = validScores.length > 0 
    ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
    : 0;

  // 根据平均分确定等级
  let overallLevel = 'N/A';
  if (averageScore >= 90) overallLevel = 'O';
  else if (averageScore >= 80) overallLevel = 'E';
  else if (averageScore >= 75) overallLevel = 'M+';
  else if (averageScore >= 70) overallLevel = 'M';
  else if (averageScore >= 60) overallLevel = 'M-';
  else if (averageScore >= 50) overallLevel = 'I';
  else if (averageScore > 0) overallLevel = 'F';

  return {
    totalIndicators,
    completedIndicators,
    averageScore: Math.round(averageScore * 100) / 100,
    overallLevel
  };
};