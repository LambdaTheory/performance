import React from 'react';
import { Card, Upload, Button, Progress, Tag, List } from 'antd';
import { UploadOutlined, FileExcelOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

const DataImport = ({
  file,
  filePreview,
  uploadProgress,
  importing,
  importResults,
  importHistory,
  uploadProps,
  onImport
}) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '8px' }}>数据导入</h3>
        <p style={{ color: '#666', margin: 0 }}>上传Excel文件，系统将自动识别考核周期并导入员工绩效数据</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* 左侧：导入区域 */}
        <div style={{ flex: 2 }}>
          <Card title="数据导入" size="small" style={{ height: '547px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Dragger {...uploadProps} style={{ padding: '20px' }}>
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                </p>
                <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持.xlsx和.xls格式，文件大小不超过10MB<br/>
                  系统将自动识别文件中的考核周期信息
                </p>
              </Dragger>
            </div>

            {filePreview && (
              <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f6ffed' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#52c41a' }}>文件信息预览</h4>
                <div style={{ fontSize: '14px' }}>
                  <p><strong>文件名：</strong>{filePreview.fileName}</p>
                  <p><strong>文件大小：</strong>{filePreview.fileSize}</p>
                </div>
              </Card>
            )}

            {uploadProgress > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Progress 
                  percent={uploadProgress} 
                  status={importing ? 'active' : 'success'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            )}

            <Button 
              type="primary" 
              size="large"
              icon={<UploadOutlined />}
              onClick={onImport}
              loading={importing}
              disabled={!file}
              style={{ width: '100%' }}
            >
              {importing ? '正在解析并导入数据...' : '开始导入'}
            </Button>
          </Card>

          {/* 导入结果 */}
          {importResults && (
            <Card title="导入结果" style={{ marginTop: '16px' }} size="small">
              {importResults.success ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <CheckOutlined style={{ color: '#52c41a', fontSize: '20px', marginRight: '8px' }} />
                    <span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                      {importResults.message}
                    </span>
                  </div>
                  
                  {importResults.detectedPeriods && (
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>检测到的考核周期：</p>
                      {importResults.detectedPeriods.map(period => (
                        <Tag key={period} color="blue" style={{ marginRight: '8px' }}>{period}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <CloseOutlined style={{ color: '#ff4d4f', fontSize: '20px', marginRight: '8px' }} />
                    <span style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>
                      {importResults.message}
                    </span>
                  </div>
                  {importResults.error && (
                    <p style={{ color: '#666', margin: 0 }}>错误详情：{importResults.error}</p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* 右侧：导入历史 */}
        <div style={{ flex: 1 }}>
          <Card 
            title="导入历史" 
            size="small"
            style={{ height: '547px' }}
            styles={{ 
              body: { 
                height: '467px',
                overflow: 'auto', 
                display: 'flex', 
                alignItems: importHistory.length > 0 ? 'flex-start' : 'center', 
                justifyContent: importHistory.length > 0 ? 'flex-start' : 'center',
                padding: '16px'
              }
            }}
          >
            {importHistory.length > 0 ? (
              <List
                size="small"
                dataSource={importHistory}
                style={{ width: '100%' }}
                renderItem={(item) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{item.fileName}</span>
                        <Tag color={item.status === 'success' ? 'green' : 'red'} style={{ marginLeft: '3px' }}>
                          {item.status === 'success' ? '成功' : '失败'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        <div>周期：
                          {item.periods.map(period => (
                            <Tag key={period} size="small" color="blue" style={{ marginLeft: '4px' }}>
                              {period}
                            </Tag>
                          ))}
                        </div>
                        <div>时间：{item.importTime}</div>
                        <div>记录数：{item.recordCount}</div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <FileExcelOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
                <p>暂无导入历史</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DataImport;