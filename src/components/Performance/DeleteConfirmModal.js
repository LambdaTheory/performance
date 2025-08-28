import React from 'react';
import { Modal } from 'antd';

const DeleteConfirmModal = ({
  visible,
  deletingEmployee,
  deleteLoading,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal
      title="确认删除"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={deleteLoading}
      okText="确认删除"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <p>确定要删除以下员工的绩效记录吗？此操作不可撤销。</p>
      {deletingEmployee && (
        <div style={{ 
          padding: '12px', 
          background: '#f5f5f5', 
          borderRadius: '4px',
          marginTop: '12px'
        }}>
          <p><strong>员工姓名：</strong>{deletingEmployee.employeeName}</p>
          <p><strong>考核表：</strong>{deletingEmployee.evaluationForm}</p>
          <p><strong>考核周期：</strong>{deletingEmployee.evaluationPeriod}</p>
          <p><strong>指标数量：</strong>{deletingEmployee.indicators?.length || 0}</p>
        </div>
      )}
    </Modal>
  );
};

export default DeleteConfirmModal;