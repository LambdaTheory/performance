
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_keep_all_data.json', 'utf8'));

console.log('=== 360°评分和上级评价保留验证 ===');
console.log('总记录数:', data.data.length);

// 检查前几个员工的评价数据
data.data.slice(0, 3).forEach(record => {
  console.log('\n员工:', record.employeeName);
  console.log('360°评分:', record._review360);
  console.log('上级评价:', record._supervisorReview);
  
  // 检查原始字段是否保留
  const original360Fields = Object.keys(record).filter(key => key.includes('360°评分-'));
  const originalSupervisorFields = Object.keys(record).filter(key => key.includes('上级评分-'));
  
  console.log('保留的360°评分原始字段:', original360Fields);
  console.log('保留的上级评价原始字段:', originalSupervisorFields);
});

console.log('\n验证完成！');
