// 360°互评数据调试脚本
const fs = require('fs');
const path = require('path');

// 读取实际数据文件
const dataPath = path.join(__dirname, 'data', 'performance', 'performance_1756455779537.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const jsonData = JSON.parse(rawData);

console.log('=== 360°互评数据调试 ===');
console.log(`数据结构: ${Object.keys(jsonData)}`);

// 获取实际的数据数组
const records = jsonData.data || [];
console.log(`总记录数: ${records.length}`);
console.log(`元数据:`, jsonData.metadata);

// 查找包含360°评分的记录
const recordsWith360Review = records.filter(record => {
  return Object.keys(record).some(key => key.includes('360°评分') && key.includes('（0.0%）（0.0%）'));
});

console.log(`包含360°评分的记录数: ${recordsWith360Review.length}`);

// 提取所有360°评价人
const allReviewers = new Set();
recordsWith360Review.forEach(record => {
  Object.keys(record).forEach(key => {
    if (key.includes('360°评分') && key.includes('（0.0%）（0.0%）')) {
      const match = key.match(/360°评分-(.+?)（0.0%）（0.0%）/);
      if (match && match[1]) {
        allReviewers.add(match[1]);
      }
    }
  });
});

console.log('发现的所有360°评价人:', Array.from(allReviewers));

// 显示前几条记录的360°评分数据
console.log('\n=== 前3条记录的360°评分数据 ===');
recordsWith360Review.slice(0, 3).forEach((record, index) => {
  console.log(`\n记录 ${index + 1} - ${record.employeeName || '未知员工'}`);
  
  Object.keys(record).forEach(key => {
    if (key.includes('360°评分') && key.includes('（0.0%）（0.0%）')) {
      const match = key.match(/360°评分-(.+?)（0.0%）（0.0%）/);
      if (match && match[1]) {
        const reviewer = match[1];
        const result = record[key];
        const remarkKey = `360°评分-${reviewer}评分说明`;
        const remark = record[remarkKey];
        
        console.log(`  ${reviewer}: ${result} - ${remark ? remark.substring(0, 50) + '...' : '无说明'}`);
      }
    }
  });
});

// 验证字段名格式
console.log('\n=== 字段名格式验证 ===');
const sampleRecord = recordsWith360Review[0];
if (sampleRecord) {
  const fields = Object.keys(sampleRecord).filter(key => key.includes('360°评分'));
  console.log('360°评分相关字段:', fields);
} else {
  // 如果没有找到360°评分记录，检查所有字段
  const allFields = Object.keys(records[0] || {});
  const relatedFields = allFields.filter(key => key.includes('360°评分'));
  console.log('所有360°评分相关字段:', relatedFields);
}