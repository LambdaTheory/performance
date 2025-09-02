// API调试脚本
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/import/performance',
  method: 'GET'
};

console.log('=== 测试API接口 ===');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('API响应状态:', res.statusCode);
      console.log('成功状态:', result.success);
      console.log('数据记录数:', result.data?.records?.length || 0);
      
      if (result.data?.records && result.data.records.length > 0) {
        const firstRecord = result.data.records[0];
        const fields360 = Object.keys(firstRecord).filter(key => key.includes('360°评分'));
        console.log('360°评分相关字段:', fields360);
        
        // 查找所有评价人
        const reviewers = new Set();
        result.data.records.forEach(record => {
          Object.keys(record).forEach(key => {
            if (key.includes('360°评分') && key.includes('（0.0%）') && !key.includes('评分说明')) {
              const match = key.match(/360°评分-(.+?)（0.0%）/);
              if (match && match[1]) {
                reviewers.add(match[1]);
              }
            }
          });
        });
        console.log('发现的所有评价人:', Array.from(reviewers));
      }
    } catch (error) {
      console.error('解析响应数据失败:', error);
      console.log('原始响应:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('API请求失败:', error.message);
});

req.end();