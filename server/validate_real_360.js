
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== 验证360°评价人修复结果 ===');
console.log(`总记录数: ${data.metadata.totalRecords}`);
console.log(`总员工数: ${data.metadata.totalEmployees}`);

console.log('\n=== 员工360°评价人分布 ===');
data.employees.forEach(emp => {
  console.log(`${emp.name}: ${emp.reviewers360.join(', ')}`);
});

console.log('\n验证完成！');
