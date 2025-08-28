import React from 'react';
import { Select, Button } from 'antd';

const { Option } = Select;

const DataFilter = ({
  selectedEvaluationForm,
  availableEvaluationForms,
  selectedPeriod,
  filteredPeriods,
  groupedDataLength,
  loading,
  onEvaluationFormChange,
  onPeriodChange,
  onRefresh
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '16px',
      padding: '16px',
      background: '#fafafa',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div>
          <span style={{ marginRight: '8px' }}>考核表：</span>
          <Select 
            value={selectedEvaluationForm} 
            onChange={onEvaluationFormChange}
            style={{ minWidth: 200 }}
          >
            <Option value="all">全部考核表</Option>
            {availableEvaluationForms.map(form => (
              <Option key={form} value={form}>{form}</Option>
            ))}
          </Select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ marginRight: '8px' }}>考核周期：</span>
            <Select 
              value={selectedPeriod} 
              onChange={onPeriodChange}
              style={{ minWidth: 150 }}
              disabled={filteredPeriods.length === 0}
            >
              {filteredPeriods.map(period => (
                <Option key={period} value={period}>{period}</Option>
              ))}
            </Select>
          </div>
          <div style={{ 
            marginLeft: '16px', 
            padding: '4px 12px',
            background: '#e6f7ff',
            borderRadius: '4px',
            border: '1px solid #91d5ff',
            color: '#1890ff',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            共 {groupedDataLength} 名员工
          </div>
        </div>
      </div>
      
      <div>
        <Button 
          onClick={onRefresh} 
          loading={loading}
          type="primary"
        >
          刷新数据
        </Button>
      </div>
    </div>
  );
};

export default DataFilter;