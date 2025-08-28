import { useState } from 'react';
import { message } from 'antd';

const useEmployeeOperations = (onDataChange) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // 添加指标编辑相关状态
  const [operationMode, setOperationMode] = useState(null);
  const [selectedIndicatorIndex, setSelectedIndicatorIndex] = useState(null);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [indicatorEditModalVisible, setIndicatorEditModalVisible] = useState(false);

  // 显示员工详情
  const showEmployeeDetail = (employee) => {
    setSelectedEmployee(employee);
    setDetailModalVisible(true);
  };

  // 编辑员工基本信息
  const handleEditEmployee = (employee) => {
    setEditingEmployee({ ...employee });
    setEditModalVisible(true);
  };

  // 保存员工基本信息
  const handleSaveEmployee = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/import/performance/employee/${encodeURIComponent(editingEmployee.employeeName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingEmployee)
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('保存成功');
        setEditModalVisible(false);
        setEditingEmployee(null);
        
        if (onDataChange) {
          await onDataChange(); // 重新加载数据
        }
        
        // 更新详情弹窗中的员工信息
        if (detailModalVisible && selectedEmployee) {
          // 更新selectedEmployee以反映更改
          setSelectedEmployee({
            ...selectedEmployee,
            ...editingEmployee
          });
        }
      } else {
        message.error('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存员工信息失败:', error);
      message.error('保存失败');
    }
  };

  // 删除员工绩效记录
  const handleDeleteEmployee = (employee) => {
    setDeletingEmployee(employee);
    setDeleteModalVisible(true);
  };

  // 确认删除员工绩效记录
  const confirmDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    try {
      setDeleteLoading(true);
      const response = await fetch(`http://localhost:3001/api/import/performance/employee/${deletingEmployee.employeeName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      const result = await response.json();
      
      if (result.success) {
        message.success('删除成功');
        setDeleteModalVisible(false);
        setDeletingEmployee(null);
        
        if (onDataChange) {
          await onDataChange();
        }
      } else {
        message.error('删除失败：' + result.message);
      }
    } catch (error) {
      console.error('删除员工失败:', error);
      message.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 关闭弹窗方法
  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedEmployee(null);
    setOperationMode(null);
    setSelectedIndicatorIndex(null);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingEmployee(null);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeletingEmployee(null);
  };

  // 修复编辑指标方法
  const handleEditIndicator = (indicatorIndex) => {
    console.log('编辑指标，索引:', indicatorIndex);
    if (!selectedEmployee || !selectedEmployee.indicators || !selectedEmployee.indicators[indicatorIndex]) {
      message.error('指标数据不存在');
      return;
    }
    
    const indicator = selectedEmployee.indicators[indicatorIndex];
    setEditingIndicator({ ...indicator });
    setIndicatorEditModalVisible(true);
    setOperationMode(null);
    setSelectedIndicatorIndex(null);
  };

  // 修复删除指标方法
  const handleDeleteIndicator = async (indicatorIndex) => {
    console.log('删除指标，索引:', indicatorIndex);
    if (!selectedEmployee || !selectedEmployee.indicators || !selectedEmployee.indicators[indicatorIndex]) {
      message.error('指标数据不存在');
      return;
    }
    
    const indicator = selectedEmployee.indicators[indicatorIndex];
    
    // 检查指标是否有ID
    if (!indicator.id) {
      message.error('指标缺少唯一标识符，无法删除');
      return;
    }
    
    try {
      // 使用正确的API路径和指标ID
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${indicator.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('删除成功');
        setOperationMode(null);
        setSelectedIndicatorIndex(null);
        
        if (onDataChange) {
          await onDataChange();
        }
        
        // 更新当前选中员工的指标数据
        const updatedIndicators = selectedEmployee.indicators.filter((_, index) => index !== indicatorIndex);
        setSelectedEmployee({
          ...selectedEmployee,
          indicators: updatedIndicators
        });
      } else {
        message.error('删除失败：' + result.message);
      }
    } catch (error) {
      console.error('删除指标失败:', error);
      message.error('删除失败');
    }
  };
  
  // 修复保存编辑的指标方法
  const handleSaveIndicator = async () => {
    if (!editingIndicator) return;
    
    // 检查指标是否有ID
    if (!editingIndicator.id) {
      message.error('指标缺少唯一标识符，无法保存');
      return;
    }
    
    try {
      // 使用正确的API路径和指标ID
      const response = await fetch(`http://localhost:3001/api/import/performance/indicator/${editingIndicator.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingIndicator)
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('保存成功');
        setIndicatorEditModalVisible(false);
        setEditingIndicator(null);
        
        if (onDataChange) {
          await onDataChange();
        }
        
        // 更新当前选中员工的指标数据
        const updatedIndicators = selectedEmployee.indicators.map(indicator => 
          indicator.id === editingIndicator.id ? editingIndicator : indicator
        );
        setSelectedEmployee({
          ...selectedEmployee,
          indicators: updatedIndicators
        });
      } else {
        message.error('保存失败：' + result.message);
      }
    } catch (error) {
      console.error('保存指标失败:', error);
      message.error('保存失败');
    }
  };
  
  // 关闭指标编辑弹窗
  const closeIndicatorEditModal = () => {
    setIndicatorEditModalVisible(false);
    setEditingIndicator(null);
  };

  const resetOperationMode = () => {
    setOperationMode(null);
    setSelectedIndicatorIndex(null);
  };

  return {
    selectedEmployee,
    setSelectedEmployee,
    detailModalVisible,
    editModalVisible,
    editingEmployee,
    setEditingEmployee,
    deleteModalVisible,
    deletingEmployee,
    deleteLoading,
    operationMode,
    selectedIndicatorIndex,
    editingIndicator,
    indicatorEditModalVisible,
    showEmployeeDetail,
    handleEditEmployee,
    handleSaveEmployee,
    handleDeleteEmployee,
    confirmDeleteEmployee,
    closeDetailModal,
    closeEditModal,
    closeDeleteModal,
    setOperationMode,
    setSelectedIndicatorIndex,
    handleEditIndicator,
    handleDeleteIndicator,
    handleSaveIndicator,
    closeIndicatorEditModal,
    setEditingIndicator
  };
};

export default useEmployeeOperations;