import React from 'react';
import { Table, Tag, Button, Space } from 'antd';
import { DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';

const EmployeeList = ({
  groupedData,
  loading,
  onViewDetails,
  onDeleteEmployee
}) => {
  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120
    },
    {
      title: '工号',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 100
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 120
    },
    {
      title: '考评表',
      dataIndex: 'evaluationForm',
      key: 'evaluationForm',
      width: 150,
      ellipsis: true
    },
    {
      title: '考核周期',
      dataIndex: 'evaluationPeriod',
      key: 'evaluationPeriod',
      width: 120
    },
    {
      title: '当前节点',
      dataIndex: 'currentNode',
      key: 'currentNode',
      width: 120
    },
    {
      title: '指标数量',
      key: 'indicatorCount',
      width: 100,
      render: (_, record) => {
        // 使用record.indicators数组长度作为指标数量
        const indicatorCount = record.indicators?.length || 0;
        return (
          <Tag color="blue">{indicatorCount}</Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => onViewDetails(record)}
          >
            查看详情
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteEmployee(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  if (groupedData.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px',
        background: '#fafafa',
        borderRadius: '8px',
        border: '1px dashed #d9d9d9'
      }}>
        <FileExcelOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <h4 style={{ color: '#999' }}>暂无绩效数据</h4>
        <p style={{ color: '#999' }}>请先在上方"数据导入"区域导入Excel绩效文件</p>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={groupedData.map((item, index) => ({ ...item, key: index }))}
      scroll={{ x: 1000 }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 名员工`
      }}
      bordered
      size="middle"
      loading={loading}
    />
  );
};

export default EmployeeList;