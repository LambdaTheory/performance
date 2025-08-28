import { useState } from 'react';
import { message } from 'antd';

const useIndicatorOperations = (onDataChange, selectedEmployee) => {
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [indicatorEditModalVisible, setIndicatorEditModalVisible] = useState(false);
  const [addIndicatorModalVisible, setAddIndicatorModalVisible] = useState(false);
  const [newIndicator, setNewIndicator] = useState(null);

  // 编辑指标
  const handleEditIndicator = (indicator) => {
    // 将小数权重转换为百分比显示
    const weightAsPercentage = indicator.weight ? Math.round(indicator.weight * 100) : '';
    setEditingIndicator({ 
      ...indicator, 
      weight: weightAsPercentage // 转换为百分比数值
    });
    setIndicatorEditModalVisible(true);
  };

  // 保存指标
  const handleSaveIndicator = async () => {
    try {
      // 验证必填字段
      if (!editingIndicator.dimensionName?.trim()) {
        message.error('维度名称为必填项');
        return;
      }
      if (!editingIndicator.indicatorName?.trim()) {
        message.error('指标名称为必填项');
        return;
      }
      if (!editingIndicator.assessmentStandard?.trim()) {
        message.error('考核标准为必填项');
        return;
      }

      // 将百分比转换回小数格式保存
      const indicatorToSave = {
        ...editingIndicator,
        weight: editingIndicator.weight ? parseFloat(editingIndicator.weight) / 100 : null
      };
      
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${editingIndicator.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(indicatorToSave)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('保存成功');
        setIndicatorEditModalVisible(false);
        setEditingIndicator(null);
        
        if (onDataChange) {
          await onDataChange(); // 重新加载数据
        }
      } else {
        message.error('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存指标失败:', error);
      message.error('保存失败');
    }
  };

  // 删除指标
  const handleDeleteIndicator = async (indicatorId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${indicatorId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('删除成功');
        
        if (onDataChange) {
          await onDataChange(); // 重新加载数据
        }
      } else {
        message.error('删除失败：' + result.message);
      }
    } catch (error) {
      console.error('删除指标失败:', error);
      message.error('删除失败');
    }
  };

  // 新增指标
  const handleAddIndicator = () => {
    if (!selectedEmployee) {
      message.error('请先选择员工');
      return;
    }
    
    // 初始化新指标数据
    setNewIndicator({
      dimensionName: '',
      indicatorName: '',
      assessmentStandard: '',
      weight: '',
      selfEvaluationResult: '',
      peerEvaluationResult: '',
      supervisorEvaluationResult: '',
      // 继承员工基本信息
      employeeName: selectedEmployee.employeeName,
      employeeId: selectedEmployee.employeeId,
      department: selectedEmployee.department,
      evaluationForm: selectedEmployee.evaluationForm,
      evaluationPeriod: selectedEmployee.evaluationPeriod,
      currentNode: selectedEmployee.currentNode
    });
    setAddIndicatorModalVisible(true);
  };

  // 保存新增指标
  const handleSaveNewIndicator = async () => {
    try {
      // 验证必填字段
      if (!newIndicator.dimensionName?.trim()) {
        message.error('维度名称为必填项');
        return;
      }
      if (!newIndicator.indicatorName?.trim()) {
        message.error('指标名称为必填项');
        return;
      }
      if (!newIndicator.assessmentStandard?.trim()) {
        message.error('考核标准为必填项');
        return;
      }

      // 将百分比转换回小数格式保存
      const indicatorToSave = {
        ...newIndicator,
        weight: newIndicator.weight ? parseFloat(newIndicator.weight) / 100 : null
      };
      
      const response = await fetch('http://localhost:3001/api/import/performance/indicator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(indicatorToSave)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('新增指标成功');
        setAddIndicatorModalVisible(false);
        setNewIndicator(null);
        
        if (onDataChange) {
          await onDataChange(); // 重新加载数据
        }
      } else {
        message.error('新增指标失败：' + result.message);
      }
    } catch (error) {
      console.error('新增指标失败:', error);
      message.error('新增指标失败');
    }
  };

  // 关闭编辑指标弹窗
  const closeIndicatorEditModal = () => {
    setIndicatorEditModalVisible(false);
    setEditingIndicator(null);
  };

  // 关闭新增指标弹窗
  const closeAddIndicatorModal = () => {
    setAddIndicatorModalVisible(false);
    setNewIndicator(null);
  };

  return {
    editingIndicator,
    setEditingIndicator,
    indicatorEditModalVisible,
    addIndicatorModalVisible,
    newIndicator,
    setNewIndicator,
    handleEditIndicator,
    handleSaveIndicator,
    handleDeleteIndicator,
    handleAddIndicator,
    handleSaveNewIndicator,
    closeIndicatorEditModal,
    closeAddIndicatorModal
  };
};

export default useIndicatorOperations;