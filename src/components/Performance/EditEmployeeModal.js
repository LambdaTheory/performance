import React from 'react';
import { Modal } from 'antd';

const EditEmployeeModal = ({
  visible,
  editingEmployee,
  onSave,
  onCancel,
  onEmployeeChange
}) => {
  if (!editingEmployee) return null;

  return (
    <Modal
      title="编辑员工信息"
      open={visible} // 改为 open 属性
      onOk={onSave}
      onCancel={onCancel}
      width={600}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div>
          <label><strong>员工姓名：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.employeeName} 
            onChange={(e) => onEmployeeChange({...editingEmployee, employeeName: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label><strong>工号：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.employeeId || ''} 
            onChange={(e) => onEmployeeChange({...editingEmployee, employeeId: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label><strong>部门：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.department} 
            onChange={(e) => onEmployeeChange({...editingEmployee, department: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label><strong>考评表：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.evaluationForm} 
            onChange={(e) => onEmployeeChange({...editingEmployee, evaluationForm: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label><strong>考核周期：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.evaluationPeriod} 
            onChange={(e) => onEmployeeChange({...editingEmployee, evaluationPeriod: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label><strong>当前节点：</strong></label>
          <input 
            type="text" 
            value={editingEmployee.currentNode} 
            onChange={(e) => onEmployeeChange({...editingEmployee, currentNode: e.target.value})}
            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default EditEmployeeModal;