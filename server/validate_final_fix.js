const fs = require('fs');

console.log('=== 最终验证360°评分修复效果 ===\n');

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
const totalRecords = data.length;

// 过滤表头行（没有员工姓名的行）
const headerRows = data.filter(r => !r.employeeName || r.employeeName === '姓名' || r.employeeName.trim() === '');
const validEmployeeRows = data.filter(r => r.employeeName && r.employeeName !== '姓名' && r.employeeName.trim() !== '');

console.log('\n📊 数据统计:');
console.log(`总记录数: ${totalRecords}`);
console.log(`表头行数: ${headerRows.length}`);
console.log(`有效员工记录: ${validEmployeeRows.length}`);

// 检查360°评分字段
console.log('\n🔍 360°评分字段分析:');

const sampleEmployee = validEmployeeRows[0];
if (sampleEmployee) {
  console.log('样本员工:', sampleEmployee.employeeName);
  const peerFields = Object.keys(sampleEmployee).filter(key => key.includes('360°评分') && !key.includes('评分说明'));
  console.log('360°评分字段:', peerFields);
  
  peerFields.forEach(field => {
    console.log(`  ${field}: ${sampleEmployee[field]}`);
  });
}

// 分析所有员工的360°评价人
console.log('\n👥 所有员工的360°评价人统计:');
const allReviewers = new Set();

validEmployeeRows.forEach(employee => {
  const peerFields = Object.keys(employee).filter(key => key.includes('360°评分') && !key.includes('评分说明'));
  
  peerFields.forEach(field => {
    const reviewer = field.replace('360°评分-', '');
    allReviewers.add(reviewer);
  });
});

console.log('发现的所有评价人:', Array.from(allReviewers));
console.log('总评价人数量:', allReviewers.size);

// 检查每个员工的360°评分情况
console.log('\n📋 前3个员工的详细360°评分:');
validEmployeeRows.slice(0, 3).forEach(employee => {
  console.log(`\n${employee.employeeName}:`);
  
  const peerFields = Object.keys(employee).filter(key => key.includes('360°评分'));
  peerFields.forEach(field => {
    if (employee[field] && employee[field] !== '') {
      console.log(`  ${field}: ${employee[field]}`);
    }
  });
});

// 验证修复效果
console.log('\n✅ 修复验证:');
if (validEmployeeRows.length === 19) {
  console.log('✅ 有效员工记录数正确: 19条');
} else {
  console.log(`❌ 有效员工记录数错误: ${validEmployeeRows.length}条 (应为19条)`);
}

if (headerRows.length === 19) {
  console.log('✅ 表头行数正确: 19条');
} else {
  console.log(`❌ 表头行数错误: ${headerRows.length}条 (应为19条)`);
}

const hasValidPeerScores = validEmployeeRows.some(employee => {
  const peerFields = Object.keys(employee).filter(key => key.includes('360°评分') && !key.includes('评分说明'));
  return peerFields.some(field => employee[field] && employee[field] !== '' && employee[field] !== 'M' && employee[field] !== 'M+');
});

if (hasValidPeerScores) {
  console.log('✅ 发现有效的360°评分数据');
} else {
  console.log('⚠️ 360°评分数据可能仍有问题');
}