import React from 'react';
import { Card, Divider } from 'antd';

// 导入自定义 hooks
import usePerformanceData from '../hooks/usePerformanceData';
import useDataImport from '../hooks/useDataImport';
import useEmployeeOperations from '../hooks/useEmployeeOperations';
import useIndicatorOperations from '../hooks/useIndicatorOperations';

// 导入模块组件
import DataImport from '../components/Performance/DataImport';
import DataFilter from '../components/Performance/DataFilter';
import EmployeeList from '../components/Performance/EmployeeList';
import EmployeeDetailModal from '../components/Performance/EmployeeDetailModal';
import EditEmployeeModal from '../components/Performance/EditEmployeeModal';
import EditIndicatorModal from '../components/Performance/EditIndicatorModal';
import DeleteConfirmModal from '../components/Performance/DeleteConfirmModal';

// 本周期绩效组件
function CurrentPerformance() {
  // 使用自定义 hooks 管理状态和逻辑
  const performanceData = usePerformanceData();
  const dataImport = useDataImport(performanceData.fetchAllPerformance);
  const employeeOps = useEmployeeOperations(performanceData.fetchAllPerformance);
  const indicatorOps = useIndicatorOperations();
  
  // 移除这个调试日志
  // console.log('employeeOps状态:', {
  //   detailModalVisible: employeeOps.detailModalVisible,
  //   selectedEmployee: employeeOps.selectedEmployee,
  //   deleteModalVisible: employeeOps.deleteModalVisible,
  //   deletingEmployee: employeeOps.deletingEmployee
  // });
  
  // 将扁平化数据转换为按员工分组的数据
  const groupedEmployeeData = React.useMemo(() => {
    if (!performanceData.performanceData || performanceData.performanceData.length === 0) {
      return [];
    }
    
    const employeeMap = new Map();
    
    performanceData.performanceData.forEach(record => {
      const key = record.employeeName;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employeeName: record.employeeName,
          employeeId: record.employeeId,
          department: record.department,
          position: record.position,
          evaluationForm: record.evaluationForm,
          evaluationPeriod: record.evaluationPeriod,
          currentNode: record.currentNode,
          level: record.level,
          indicators: []
        });
      }
      
      employeeMap.get(key).indicators.push({
        id: record.id,
        dimensionName: record.dimensionName,
        indicatorName: record.indicatorName,
        weight: record.weight,
        performanceResult: record.performanceResult,
        assessmentStandard: record.assessmentStandard
      });
    });
    
    return Array.from(employeeMap.values());
  }, [performanceData.performanceData]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 数据导入区域 */}
      <Card title="数据导入" style={{ marginBottom: '24px' }}>
        <DataImport {...dataImport} onImport={dataImport.handleImport} />
      </Card>

      <Divider />

      {/* 本周期绩效管理区域 */}
      <Card title="本周期绩效管理">
        {/* 筛选器 */}
        <DataFilter 
          availableEvaluationForms={performanceData.availableEvaluationForms}
          selectedEvaluationForm={performanceData.selectedEvaluationForm}
          availablePeriods={performanceData.availablePeriods}
          selectedPeriod={performanceData.selectedPeriod}
          filteredPeriods={performanceData.filteredPeriods}
          groupedDataLength={groupedEmployeeData.length}
          loading={performanceData.loading}
          onEvaluationFormChange={performanceData.handleEvaluationFormChange}
          onPeriodChange={(value) => performanceData.setSelectedPeriod(value)}
          onRefresh={performanceData.fetchAllPerformance}
        />

        <Divider />

        {/* Employee List */}
        <EmployeeList 
          groupedData={groupedEmployeeData}
          loading={performanceData.loading}
          onViewDetails={(employee) => {
            employeeOps.showEmployeeDetail(employee);
          }}
          onDeleteEmployee={(employee) => {
            employeeOps.handleDeleteEmployee(employee);
          }}
        />
        
      </Card>

      {/* 员工详情弹窗 */}
      <EmployeeDetailModal
        visible={employeeOps.detailModalVisible}
        selectedEmployee={employeeOps.selectedEmployee}
        operationMode={employeeOps.operationMode}
        selectedIndicatorIndex={employeeOps.selectedIndicatorIndex}
        onClose={employeeOps.closeDetailModal}
        onEditEmployee={employeeOps.handleEditEmployee}
        onEditIndicator={employeeOps.handleEditIndicator}
        onDeleteIndicator={employeeOps.handleDeleteIndicator}
        onSetOperationMode={employeeOps.setOperationMode}
        onSetSelectedIndicatorIndex={employeeOps.setSelectedIndicatorIndex}
      />

      {/* 编辑员工信息弹窗 */}
      <EditEmployeeModal
        visible={employeeOps.editModalVisible}
        editingEmployee={employeeOps.editingEmployee}
        onSave={employeeOps.handleSaveEmployee}
        onCancel={employeeOps.closeEditModal}
        onEmployeeChange={employeeOps.setEditingEmployee}
      />

      {/* 编辑指标弹窗 */}
      <EditIndicatorModal
        visible={employeeOps.indicatorEditModalVisible}
        editingIndicator={employeeOps.editingIndicator}
        onSave={employeeOps.handleSaveIndicator}
        onCancel={employeeOps.closeIndicatorEditModal}
        onIndicatorChange={employeeOps.setEditingIndicator}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal 
        visible={employeeOps.deleteModalVisible}
        employee={employeeOps.deletingEmployee}
        loading={employeeOps.deleteLoading}
        onConfirm={employeeOps.confirmDeleteEmployee}
        onCancel={employeeOps.closeDeleteModal}
      />
    </div>
  );
}

export default CurrentPerformance;