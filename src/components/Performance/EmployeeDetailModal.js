import React from 'react';
import { Modal, Card, Button, Space, Table, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

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
      width: 120,
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
      width: 350,
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
      width: 80,
      render: (weight) => {
        if (!weight) return '-';
        const percentage = Math.round(weight * 100);
        return `${percentage}%`;
      }
    },

    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record, index) => (
        <Space size="small">
          <Button 
            type="link" 
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除指标"${record.indicatorName}"吗？`,
                onOk: () => {
                  onDeleteIndicator(index);
                }
              });
            }}
            style={{ padding: '0 4px' }}
          >
              删除
            </Button>
          {(record.indicatorName?.includes('工作业绩') || record.indicatorName?.includes('业绩') || record.indicatorName?.includes('绩效') || record.indicatorName?.includes('KPI')) && (
            <Button 
              type="link" 
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEditIndicator(index);
              }}
              style={{ padding: '0 4px' }}
            >
              编辑
            </Button>
          )}
        </Space>
      )
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
            </div>
          } 
          size="small"
        >
          <Table
            dataSource={selectedEmployee.indicators.map((item, index) => ({ ...item, key: index }))}
            columns={columns}
            pagination={false}
            size="small"
            tableLayout="auto"
          />
        </Card>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;