const fs = require('fs');
const path = require('path');

// 读取最新的数据文件
const dataPath = path.join(__dirname, 'data', 'performance', 'performance_1756699793319.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

console.log('=== 当前360°评价人分布检查 ===');
console.log(`总记录数: ${data.data.length}`);

// 按员工分组检查360°评价人
const employeeReviews = {};
const tableHeaders = [];

// 首先找出所有表头行
const headerRows = data.data.filter(row => row.employeeName === '姓名' || row.evaluationForm === '所在考评表');
console.log(`\n找到 ${headerRows.length} 个表头行:`);

headerRows.forEach((header, index) => {
  console.log(`\n表头 ${index + 1}:`);
  
  // 收集360°评价人字段
  const reviewers = [];
  Object.keys(header).forEach(key => {
    if (key.includes('360°评分-') && !key.includes('评分说明')) {
      const reviewerName = key.replace('360°评分-', '').replace('（0.0%）（0.0%）', '').replace('（0.0%）', '');
      if (reviewerName && reviewerName !== '刘志润' && reviewerName !== '郑志宏') {
        reviewers.push(reviewerName);
      }
    }
  });
  
  console.log(`  360°评价人: ${reviewers.join(', ')}`);
  tableHeaders.push({
    index: index + 1,
    reviewers: reviewers
  });
});

// 检查每个员工的实际评价人
console.log('\n=== 员工实际360°评价人 ===');
const employees = [...new Set(data.data.filter(row => row.employeeName && row.employeeName !== '姓名').map(row => row.employeeName))];

employees.forEach(empName => {
  const empRecords = data.data.filter(row => row.employeeName === empName);
  
  // 找出该员工对应的表头
  let empHeader = null;
  for (let i = 0; i < data.data.length; i++) {
    const row = data.data[i];
    if (row.employeeName === '姓名' || row.evaluationForm === '所在考评表') {
      // 这是表头行，检查下一个员工记录
      continue;
    }
    if (row.employeeName === empName) {
      // 找到该员工的记录，使用之前的表头
      break;
    }
  }
  
  console.log(`${empName}: 需要检查具体记录`);
});

console.log('\n=== 字段映射关系 ===');
// 显示实际的字段映射
const sampleRecords = data.data.filter(row => row.employeeName && row.employeeName !== '姓名').slice(0, 3);
sampleRecords.forEach(record => {
  console.log(`\n员工: ${record.employeeName}`);
  Object.keys(record).forEach(key => {
    if (key.includes('360°评分-') && record[key]) {
      console.log(`  ${key}: ${record[key]}`);
    }
  });
});