const fs = require('fs');
const path = require('path');

const fixedPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_360.json');
const data = JSON.parse(fs.readFileSync(fixedPath, 'utf8'));

console.log('=== 360°评分修复验证 ===');
console.log('总记录数:', data.data.length);

const employees = {};
data.data.forEach(record => {
  const name = record.employeeName;
  if (!employees[name]) {
    employees[name] = { name, peerEvaluators: [] };
  }
  
  Object.keys(record).forEach(key => {
    if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
      const evaluator = key.replace('360°评分-', '');
      if (!employees[name].peerEvaluators.includes(evaluator)) {
        employees[name].peerEvaluators.push(evaluator);
      }
    }
  });
});

console.log('\n员工评价人分布:');
Object.values(employees).forEach(emp => {
  console.log(`- ${emp.name}: ${emp.peerEvaluators.join(', ')}`);
});

console.log('\n验证完成！');