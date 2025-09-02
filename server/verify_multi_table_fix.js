const fs = require('fs');

console.log('=== 验证多表结构360°评分修复 ===\n');

const filePath = 'data/performance/performance_1756464678679.json';

if (!fs.existsSync(filePath)) {
  console.log('❌ JSON文件不存在');
  process.exit(1);
}

const rawData = fs.readFileSync(filePath, 'utf8');
const jsonData = JSON.parse(rawData);

console.log('✅ JSON文件读取成功');
console.log('数据结构:', Object.keys(jsonData));
console.log('数据数组长度:', jsonData.data.length);

// 分析数据
const data = jsonData.data;

// 按员工分组
const employeeGroups = {};
data.forEach(record => {
  const name = record.employeeName;
  if (name && name !== '姓名') {
    if (!employeeGroups[name]) {
      employeeGroups[name] = [];
    }
    employeeGroups[name].push(record);
  }
});

console.log('\n📊 员工分组统计:');
console.log(`总员工数: ${Object.keys(employeeGroups).length}`);

// 检查每个员工的360°评价人
console.log('\n👥 每个员工的360°评价人:');
Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  const peerFields = new Set();
  
  employeeRecords.forEach(record => {
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        const reviewer = key.replace('360°评分-', '');
        peerFields.add(reviewer);
      }
    });
  });
  
  console.log(`${employeeName}: ${Array.from(peerFields).join(', ')}`);
});

// 验证修复效果
console.log('\n✅ 修复验证:');

// 检查记录数
const totalRecords = data.length;
const validEmployees = Object.keys(employeeGroups).length;
const expectedEmployees = 19;

console.log(`总记录数: ${totalRecords}`);
console.log(`有效员工数: ${validEmployees}`);

if (validEmployees === expectedEmployees) {
  console.log('✅ 员工数量正确: 19个');
} else {
  console.log(`❌ 员工数量错误: ${validEmployees}个 (应为${expectedEmployees}个)`);
}

// 检查每个员工是否有正确的评价人
const hasCorrectReviewers = Object.keys(employeeGroups).every(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  const peerFields = [];
  
  employeeRecords.forEach(record => {
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        peerFields.push(key);
      }
    });
  });
  
  return peerFields.length > 0;
});

if (hasCorrectReviewers) {
  console.log('✅ 所有员工都有正确的360°评价人');
} else {
  console.log('❌ 部分员工缺少360°评价人');
}

// 显示前3个员工的详细数据
console.log('\n📋 前3个员工的360°评分详情:');
Object.keys(employeeGroups).slice(0, 3).forEach(employeeName => {
  console.log(`\n${employeeName}:`);
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.slice(0, 2).forEach(record => {
    const peerFields = Object.keys(record).filter(key => key.includes('360°评分'));
    peerFields.forEach(field => {
      if (record[field] && record[field] !== '') {
        console.log(`  ${field}: ${record[field]}`);
      }
    });
  });
});