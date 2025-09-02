import React from 'react';
import { Card, List, Tag, Empty } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';

const ImportHistory = ({ importHistory }) => {
  return (
    <div>
      {importHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Empty 
            image={<FileExcelOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
            description="暂无导入历史记录"
          />
        </div>
      ) : (
        <List
          size="small"
          dataSource={importHistory}
          style={{ width: '100%' }}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.fileName}</span>
                  <Tag color={item.status === 'success' ? 'green' : 'red'}>
                    {item.status === 'success' ? '成功' : '失败'}
                  </Tag>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>考核周期：</strong>
                    {item.periods && item.periods.length > 0 ? (
                      item.periods.map(period => (
                        <Tag key={period} size="small" color="blue" style={{ marginLeft: '4px' }}>
                          {period}
                        </Tag>
                      ))
                    ) : (
                      <span>未知周期</span>
                    )}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>导入时间：</strong>{item.importTime}
                  </div>
                  <div>
                    <strong>记录数：</strong>{item.recordCount || 0} 条
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default ImportHistory;