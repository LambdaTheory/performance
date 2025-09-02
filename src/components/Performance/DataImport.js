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

      <div style={{ marginBottom: '24px' }}>
        <Card title="数据导入" size="small">
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
      </div>
    </div>
  );
};

export default DataImport;