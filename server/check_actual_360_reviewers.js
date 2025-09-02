const fs = require('fs');

// 读取原始数据
const originalData = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

console.log('=== 检查真实的360°评价人分布 ===');

const allRecords = originalData.data;

// 按员工分组，并找出每个员工的真实360°评价人
const employeeGroups = {};
let currentEmployee = null;

allRecords.forEach(record => {
  if (record.employeeName && record.employeeName !== '姓名') {
    const name = record.employeeName.trim();
    if (!employeeGroups[name]) {
      employeeGroups[name] = {
        records: [],
        reviewers360: new Set()
      };
    }
    
    // 收集该员工的所有360°评分字段
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
        const match = key.match(/360°评分-([^（]+)（/);
        if (match) {
          employeeGroups[name].reviewers360.add(match[1].trim());
        }
      }
    });
    
    employeeGroups[name].records.push(record);
  }
});

console.log('每个员工的真实360°评价人：');
Object.keys(employeeGroups).forEach(name => {
  const reviewers = Array.from(employeeGroups[name].reviewers360);
  console.log(`${name}: ${reviewers.join(', ') || '无360°评价人'}`);
});

console.log('\n详细检查每个员工的前几条记录：');
Object.keys(employeeGroups).slice(0, 5).forEach(name => {
  console.log(`\n${name}:`);
  const records = employeeGroups[name].records.slice(0, 2);
  records.forEach(record => {
    console.log(`  记录ID: ${record.id}`);
    const reviewKeys = Object.keys(record).filter(key => key.includes('360°评分-'));
    reviewKeys.forEach(key => {
      console.log(`    ${key}: ${record[key]}`);
    });
  });
});

// 检查表头行
console.log('\n检查所有表头行：');
const headerRows = allRecords.filter(record => 
  record.employeeName === '姓名' && record.evaluationForm === '所在考评表'
);

headerRows.forEach((header, index) => {
  console.log(`\n表头 ${index + 1}:`);
  const reviewKeys = Object.keys(header).filter(key => key.includes('360°评分-'));
  reviewKeys.forEach(key => {
    console.log(`  ${key}: ${header[key]}`);
  });
});