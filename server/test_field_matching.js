// 字段匹配测试
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'performance', 'performance_1756455779537.json');

console.log('=== 字段匹配测试 ===');

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(rawData);
  const records = jsonData.data || [];
  
  console.log('总记录数:', records.length);
  
  if (records.length > 0) {
    const firstRecord = records[0];
    console.log('第一条记录的所有字段:');
    Object.keys(firstRecord).forEach(key => {
      console.log(`  ${key}: ${firstRecord[key]}`);
    });
    
    console.log('\n360°评分相关字段:');
    Object.keys(firstRecord).forEach(key => {
      if (key.includes('360°评分')) {
        console.log(`  ${key}: ${firstRecord[key]}`);
      }
    });
    
    // 测试正则匹配
    console.log('\n正则匹配测试:');
    Object.keys(firstRecord).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        const match1 = key.match(/360°评分-(.+?)（0\.0%）/);
        const match2 = key.match(/360°评分-(.+?)（0\.0%）（0\.0%）/);
        console.log(`  字段: ${key}`);
        console.log(`    单百分号匹配: ${match1 ? match1[1] : '无匹配'}`);
        console.log(`    双百分号匹配: ${match2 ? match2[1] : '无匹配'}`);
      }
    });
  }
} catch (error) {
  console.error('读取文件失败:', error);
}