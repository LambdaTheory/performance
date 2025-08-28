import { useState, useEffect } from 'react';
import { message } from 'antd';

const usePerformanceData = () => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [summary, setSummary] = useState({});
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [availableEvaluationForms, setAvailableEvaluationForms] = useState([]);
  const [selectedEvaluationForm, setSelectedEvaluationForm] = useState('all');
  const [filteredPeriods, setFilteredPeriods] = useState([]);

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

  const fetchAllPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/import/performance');
      const result = await response.json();
      
      if (result.success) {
        // 修改过滤条件，包含更多状态的数据
        const filteredRecords = (result.data.records || []).filter(record => 
          record.currentNode === '正在考核' || 
          record.currentNode === '考核结束' || 
          record.currentNode === '待考核' ||
          !record.currentNode // 包含没有状态字段的记录
        );
        
        // 本周期绩效显示所有有效的数据，不再只限制"正在考核"
        const currentPeriodRecords = filteredRecords;
        
        setPerformanceData(currentPeriodRecords);
        
        // 提取当前周期的考核周期
        const periods = [...new Set(
          currentPeriodRecords.map(record => record.evaluationPeriod).filter(Boolean)
        )];
        setAvailablePeriods(periods);
        
        // 提取所有可用的考核表并去重
        const evaluationForms = [...new Set(
          currentPeriodRecords.map(record => record.evaluationForm).filter(Boolean)
        )];
        setAvailableEvaluationForms(evaluationForms);
        
        // 默认选择第一个考核表（如果存在）
        if (evaluationForms.length > 0) {
          setSelectedEvaluationForm(evaluationForms[0]);
          // 根据选择的考核表筛选周期
          const formPeriods = [...new Set(
            currentPeriodRecords
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

  // 处理考核表选择变化
  const handleEvaluationFormChange = (value) => {
    setSelectedEvaluationForm(value);
    
    if (value === 'all') {
      setFilteredPeriods(availablePeriods);
      setSelectedPeriod(availablePeriods.length > 0 ? availablePeriods[0] : '');
    } else {
      // 根据选择的考核表筛选周期
      const formPeriods = [...new Set(
        performanceData
          .filter(record => record.evaluationForm === value)
          .map(record => record.evaluationPeriod)
          .filter(Boolean)
      )];
      setFilteredPeriods(formPeriods);
      setSelectedPeriod(formPeriods.length > 0 ? formPeriods[0] : '');
    }
  };

  useEffect(() => {
    fetchAllPerformance();
  }, []);

  return {
    loading,
    performanceData,
    summary,
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    availableEvaluationForms,
    selectedEvaluationForm,
    filteredPeriods,
    performanceLevelMap,
    fetchAllPerformance,
    handleEvaluationFormChange
  };
};

export default usePerformanceData;