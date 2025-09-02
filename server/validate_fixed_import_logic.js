
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_import_logic.json', 'utf8'));

console.log('=== 360°评分导入逻辑修复验证 ===');
console.log('总记录数:', data.data.length);
console.log('员工数:', data.employees.length);

const issues = [];

data.employees.forEach(employee => {
  const name = employee.name;
  const declaredReviewers = employee.reviewers360 || [];
  const actualReviewers = Object.keys(employee.review360 || {});
  
  console.log("\n" + name + " (表头 " + employee.tableIndex + "):");
  console.log("  声明的评价人: [" + declaredReviewers.join(', ') + "]");
  console.log("  实际评分人: [" + actualReviewers.join(', ') + "]");
  
  // 检查是否一致
  const missingReviewers = declaredReviewers.filter(r => !actualReviewers.includes(r));
  const extraReviewers = actualReviewers.filter(r => !declaredReviewers.includes(r));
  
  if (missingReviewers.length > 0) {
    console.log("  ❌ 缺少评价人: [" + missingReviewers.join(', ') + "]");
    issues.push({name, issue: '缺少评价人', reviewers: missingReviewers});
  }
  
  if (extraReviewers.length > 0) {
    console.log("  ⚠️  额外评价人: [" + extraReviewers.join(', ') + "]");
    issues.push({name, issue: '额外评价人', reviewers: extraReviewers});
  }
  
  if (missingReviewers.length === 0 && extraReviewers.length === 0) {
    console.log("  ✅ 评价人一致");
  }
});

console.log("\n=== 问题汇总 ===");
console.log("发现问题: " + issues.length + "个");
issues.forEach(issue => {
  console.log("  " + issue.name + ": " + issue.issue + " - [" + issue.reviewers.join(', ') + "]");
});

if (issues.length === 0) {
  console.log('✅ 所有员工的360°评价人数据都正确！');
} else {
  console.log('❌ 发现问题，需要进一步检查数据导入逻辑');
}

console.log('验证完成！');
