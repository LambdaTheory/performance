const fs = require('fs');

console.log('=== 检查实际360°评分数据结构 ===');

const file = './data/performance/performance_1756464678679.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('数据结构:', Object.keys(data));
console.log('数据数组长度:', data.data.length);

// 查找有效员工记录
const validRecords = data.data.filter(r => r && r.employeeName && r.employeeName !== '姓名' && r.employeeName !== '');
console.log('有效员工记录:', validRecords.length);

// 检查前几个员工的360°评分字段
validRecords.slice(0, 5).forEach((record, index) => {
  console.log(`\n员工 ${index + 1}: ${record.employeeName}`);
  
  const allFields = Object.keys(record);
  const peerFields = allFields.filter(key => key.includes('360°评分'));
  
  console.log(`  所有360°字段: ${peerFields.length}`);
  peerFields.forEach(field => {
    const value = record[field];
    if (value && value !== '') {
      console.log(`    ${field} -> ${value}`);
    }
  });
});

// 统计所有出现的360°评分值（这些是实际的评价人）
const allPeerValues = new Set();
validRecords.forEach(record => {
  Object.entries(record).forEach(([key, value]) => {
    if (key.includes('360°评分') && value && value !== '' && !key.includes('评分说明')) {
      allPeerValues.add(value);
    }
  });
});

console.log('\n所有出现的360°评分值（实际评价人）:');
Array.from(allPeerValues).sort().forEach(value => {
  console.log(`  ${value}`);
});