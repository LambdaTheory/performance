import { useState } from 'react';
import { message } from 'antd';

const useDataImport = (onImportSuccess) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importHistory, setImportHistory] = useState([]);
  const [filePreview, setFilePreview] = useState(null);

  // 获取导入历史
  const fetchImportHistory = async () => {
    try {
      const response = await fetch('/api/import/history');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const formattedHistory = result.data.map(record => ({
            id: record.id,
            fileName: record.filename,
            periods: record.periods || ['未知周期'],
            importTime: new Date(record.importTime).toLocaleString(),
            status: record.status,
            recordCount: record.recordCount,
            importTimestamp: new Date(record.importTime).getTime() // 用于排序的时间戳
          }));
          
          // 按时间降序排序并去重（基于文件名）
          const uniqueHistory = [];
          const seenFileNames = new Set();
          
          // 先按时间降序排序
          const sortedHistory = formattedHistory.sort((a, b) => b.importTimestamp - a.importTimestamp);
          
          // 去重：只保留每个文件名的最新一条记录
          for (const record of sortedHistory) {
            if (!seenFileNames.has(record.fileName)) {
              uniqueHistory.push(record);
              seenFileNames.add(record.fileName);
              // 限制显示最多3条记录
              if (uniqueHistory.length >= 3) break;
            }
          }
          
          setImportHistory(uniqueHistory);
        }
      }
    } catch (error) {
      console.error('获取导入历史失败:', error);
    }
  };

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB！');
        return false;
      }
      setFile(file);
      
      setFilePreview({
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        estimatedRecords: '预计25条记录',
        detectedPeriods: ['2024-Q1', '2024-Q2']
      });
      
      return false;
    },
    onRemove: () => {
      setFile(null);
      setFilePreview(null);
    },
    fileList: file ? [file] : []
  };

  // 开始导入
  const handleImport = async () => {
    if (!file) {
      message.error('请选择要导入的Excel文件！');
      return;
    }

    setImporting(true);
    setUploadProgress(0);
    setImportResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
        message.success('导入成功！');
        
        await fetchImportHistory();
        if (onImportSuccess) {
          await onImportSuccess(); // 刷新绩效数据
        }
        
        setFile(null);
        setFilePreview(null);
      } else {
        throw new Error('导入失败');
      }
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请检查文件格式和网络连接');
      
      setImportResults({
        success: false,
        message: '导入失败',
        error: error.message
      });
    } finally {
      setImporting(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return {
    file,
    importing,
    importResults,
    uploadProgress,
    importHistory,
    filePreview,
    uploadProps,
    handleImport,
    fetchImportHistory
  };
};

export default useDataImport;