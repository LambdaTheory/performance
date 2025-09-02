import React from 'react';
import { Modal } from 'antd';

const EditIndicatorModal = ({
  visible,
  editingIndicator,
  onSave,
  onCancel,
  onIndicatorChange
}) => {
  if (!editingIndicator) return null;

  return (
    <Modal
      title="编辑指标"
      open={visible}
      onOk={onSave}
      onCancel={onCancel}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div>
          <label><strong>维度名称：<span style={{color: 'red'}}>*</span></strong></label>
          <input 
            type="text" 
            value={editingIndicator.dimensionName} 
            onChange={(e) => onIndicatorChange({...editingIndicator, dimensionName: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '4px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px'
            }}
            placeholder="请输入维度名称"
          />
        </div>
        <div>
          <label><strong>指标名称：<span style={{color: 'red'}}>*</span></strong></label>
          <input 
            type="text" 
            value={editingIndicator.indicatorName} 
            onChange={(e) => onIndicatorChange({...editingIndicator, indicatorName: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '4px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px'
            }}
            placeholder="请输入指标名称"
          />
        </div>
        <div>
          <label><strong>考核标准：<span style={{color: 'red'}}>*</span></strong></label>
          <textarea 
            value={editingIndicator.assessmentStandard} 
            onChange={(e) => onIndicatorChange({...editingIndicator, assessmentStandard: e.target.value})}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '4px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px', 
              resize: 'vertical',
              minHeight: '80px',
              maxHeight: '300px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              fontSize: '14px',
              overflow: 'auto'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
            }}
            placeholder="请输入考核标准..."
          />
        </div>
        <div>
          <label><strong>权重(%)：</strong></label>
          <input 
            type="number" 
            min="0"
            max="100"
            step="1"
            value={editingIndicator.weight ? Math.round(editingIndicator.weight * 100) : ''} 
            onChange={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) / 100 : null;
              onIndicatorChange({...editingIndicator, weight: value});
            }}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '4px', 
              border: '1px solid #d9d9d9', 
              borderRadius: '4px'
            }}
            placeholder="请输入权重百分比（如：40）"
          />
        </div>

      </div>
    </Modal>
  );
};

export default EditIndicatorModal;