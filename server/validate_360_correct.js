
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_correct.json', 'utf8'));

console.log('=== 360°评分修复验证 ===');
console.log('总记录数:', data.data.length);

const employeeReviewers = {};
data.data.forEach(record => {
  const name = record.employeeName;
  if (!employeeReviewers[name]) {
    employeeReviewers[name] = new Set();
  }
  
  if (record.review360) {
    Object.keys(record.review360).forEach(reviewer => {
      employeeReviewers[name].add(reviewer);
    });
  }
});

console.log('员工360°评价人分布:');
Object.keys(employeeReviewers).forEach(name => {
  console.log(`${name}: ${Array.from(employeeReviewers[name]).join(', ')}`);
});

console.log('验证完成！');
