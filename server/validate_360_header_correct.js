
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_header_correct.json', 'utf8'));

console.log('=== 360°评分header修复验证 ===');
console.log('总记录数:', data.data.length);

const employeeReviewers = {};
data.data.forEach(record => {
  const name = record.employeeName;
  if (!employeeReviewers[name]) {
    employeeReviewers[name] = {};
  }
  
  if (record.review360) {
    Object.keys(record.review360).forEach(reviewer => {
      employeeReviewers[name][reviewer] = record.review360[reviewer].score;
    });
  }
});

console.log('员工360°评价人分布:');
Object.keys(employeeReviewers).forEach(name => {
  const scores = employeeReviewers[name];
  const reviewers = Object.keys(scores);
  console.log(`${name}: ${reviewers.join(', ')}`);
});

console.log('验证完成！');
