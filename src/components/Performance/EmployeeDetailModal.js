import React from 'react';
import { Modal, Card, Button, Space, Table, message } from 'antd';

const EmployeeDetailModal = ({
  visible, // 保留这个参数名，因为父组件传递的是visible
  selectedEmployee,
  operationMode,
  selectedIndicatorIndex,
  onClose,
  onEditEmployee,
  onEditIndicator,
  onDeleteIndicator,
  onSetOperationMode,
  onSetSelectedIndicatorIndex
}) => {
  if (!selectedEmployee) return null;

  const handleRowClick = (record, index) => {
    if (operationMode === 'edit') {
      onEditIndicator(index); // 传递索引而不是指标对象
      onSetOperationMode(null);
      onSetSelectedIndicatorIndex(null);
    } else if (operationMode === 'delete') {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除指标"${record.indicatorName}"吗？`,
        onOk: () => {
          onDeleteIndicator(index); // 传递索引而不是record.id
          onSetOperationMode(null);
          onSetSelectedIndicatorIndex(null);
        },
        onCancel: () => {
          onSetOperationMode(null);
          onSetSelectedIndicatorIndex(null);
        }
      });
    }
  };

  const columns = [
    {
      title: '维度',
      dataIndex: 'dimensionName',
      key: 'dimensionName',
      width: 120
    },
    {
      title: '指标名称',
      dataIndex: 'indicatorName',
      key: 'indicatorName',
      width: 200,
      render: (text) => (
        <div style={{ 
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5'
        }}>
          {text}
        </div>
      )
    },
    {
      title: '考核标准',
      dataIndex: 'assessmentStandard',
      key: 'assessmentStandard',
      width: 400,
      render: (text) => (
        <div style={{ 
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
          padding: '8px 0'
        }}>
          {text}
        </div>
      )
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight) => {
        if (!weight) return '-';
        const percentage = Math.round(weight * 100);
        return `${percentage}%`;
      }
    }
  ];

  return (
    <Modal
      title={selectedEmployee?.employeeName + ' - 绩效详情'}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={1400}
      style={{ top: 20 }}
    >
      <div>
        {/* 员工基本信息 */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>基本信息</span>
              <Button 
                type="primary" 
                size="small"
                onClick={() => onEditEmployee(selectedEmployee)}
              >
                编辑信息
              </Button>
            </div>
          } 
          size="small" 
          style={{ marginBottom: '16px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div><strong>姓名：</strong>{selectedEmployee.employeeName}</div>
            <div><strong>工号：</strong>{selectedEmployee.employeeId || '-'}</div>
            <div><strong>部门：</strong>{selectedEmployee.department}</div>
            <div><strong>考评表：</strong>{selectedEmployee.evaluationForm}</div>
            <div><strong>考核周期：</strong>{selectedEmployee.evaluationPeriod}</div>
            <div><strong>当前节点：</strong>{selectedEmployee.currentNode}</div>
          </div>
        </Card>

        {/* 绩效结果模块 */}
        <Card 
          title="绩效结果" 
          size="small" 
          style={{ marginBottom: '16px' }}
        >
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
                {selectedEmployee.indicators[0]?.level || '暂无数据'}
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
                  const performanceResultIndicator = selectedEmployee.indicators.find(indicator => 
                    indicator.performanceResult && indicator.performanceResult.trim() !== ''
                  );
                  
                  return performanceResultIndicator?.performanceResult || 
                    (selectedEmployee.indicators[0]?.performanceResult || '暂无数据');
                })()}
              </div>
            </div>
          </div>
        </Card>

        {/* 考核指标详情 */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{`考核指标 (${selectedEmployee.indicators.length}项)`}</span>
              <Space>
                <Button 
                  type="primary"
                  size="small"
                  onClick={() => onEditEmployee(selectedEmployee)}
                >
                  编辑员工信息
                </Button>
                <Button 
                  type={operationMode === 'edit' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    if (operationMode === 'edit') {
                      onSetOperationMode(null);
                      onSetSelectedIndicatorIndex(null);
                    } else {
                      onSetOperationMode('edit');
                      onSetSelectedIndicatorIndex(null);
                      message.info('请点击要编辑的指标行');
                    }
                  }}
                >
                  {operationMode === 'edit' ? '取消编辑' : '编辑指标'}
                </Button>
                <Button 
                  type={operationMode === 'delete' ? 'primary' : 'default'}
                  danger={operationMode !== 'delete'}
                  size="small"
                  onClick={() => {
                    if (operationMode === 'delete') {
                      onSetOperationMode(null);
                      onSetSelectedIndicatorIndex(null);
                    } else {
                      onSetOperationMode('delete');
                      onSetSelectedIndicatorIndex(null);
                      message.info('请点击要删除的指标行');
                    }
                  }}
                >
                  {operationMode === 'delete' ? '取消删除' : '删除指标'}
                </Button>
              </Space>
            </div>
          } 
          size="small"
        >
          {operationMode && (
            <div style={{ 
              padding: '8px 16px', 
              marginBottom: '16px', 
              backgroundColor: operationMode === 'edit' ? '#e6f7ff' : '#fff2e8',
              border: `1px solid ${operationMode === 'edit' ? '#91d5ff' : '#ffbb96'}`,
              borderRadius: '4px'
            }}>
              <span style={{ color: operationMode === 'edit' ? '#1890ff' : '#fa8c16' }}>
                {operationMode === 'edit' ? '📝 编辑模式：请点击要编辑的指标行' : '🗑️ 删除模式：请点击要删除的指标行'}
              </span>
            </div>
          )}
          <Table
            dataSource={selectedEmployee.indicators.map((item, index) => ({ ...item, key: index }))}
            columns={columns}
            pagination={false}
            size="small"
            tableLayout="fixed"
            onRow={(record, index) => ({
              onClick: () => handleRowClick(record, index),
              style: {
                cursor: operationMode ? 'pointer' : 'default',
                backgroundColor: operationMode && selectedIndicatorIndex === index ? 
                  (operationMode === 'edit' ? '#e6f7ff' : '#fff2e8') : 'transparent',
                transition: 'background-color 0.2s'
              },
              onMouseEnter: (e) => {
                if (operationMode) {
                  e.currentTarget.style.backgroundColor = operationMode === 'edit' ? '#f0f9ff' : '#fef7f0';
                }
              },
              onMouseLeave: (e) => {
                if (operationMode && selectedIndicatorIndex !== index) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }
            })}
          />
        </Card>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;