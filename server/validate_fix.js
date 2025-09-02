const fs = require('fs');
const path = require('path');

console.log('=== 验证360°评分修复效果 ===\n');

// 读取现有JSON文件
const jsonFile = 'd:\\performance\\performance\\server\\data\\performance\\performance_1756464678679.json';

if (!fs.existsSync(jsonFile)) {
  console.error('❌ JSON文件不存在:', jsonFile);
  process.exit(1);
}

const fileContent = fs.readFileSync(jsonFile, 'utf8');
let jsonData;

try {
  jsonData = JSON.parse(fileContent);
  console.log('✅ 成功读取JSON文件');
} catch (error) {
  console.error('❌ JSON解析失败:', error.message);
  process.exit(1);
}

// 获取实际的数据数组
const data = jsonData.data || [];
console.log(`📁 数据结构: ${Object.keys(jsonData)}`);
console.log(`📊 数据数组长度: ${data.length}`);

// 分析数据结构
console.log('\n📊 数据结构分析:');
console.log(`   - 总记录数: ${data.length}`);
console.log(`   - 元数据记录: ${data.filter(r => r && (r.employeeName === '姓名' || !r.employeeName || r.employeeName === '')).length}`);
console.log(`   - 有效员工记录: ${data.filter(r => r && r.employeeName && r.employeeName !== '姓名' && r.employeeName !== '').length}`);

// 检查metadata中的headers
if (jsonData.metadata && jsonData.metadata.headers) {
  console.log('\n📋 Metadata Headers:');
  const headers = jsonData.metadata.headers;
  const peerFields = headers.filter(h => h.includes('360°评分'));
  console.log(`   - 总字段数: ${headers.length}`);
  console.log(`   - 360°评分字段: ${peerFields.length}`);
  peerFields.forEach(field => console.log(`     * ${field}`));
}

// 检查360°评分字段
const allFields = new Set();
data.forEach(record => {
  Object.keys(record).forEach(key => {
    if (key.includes('360°评分')) {
      allFields.add(key);
    }
  });
});

console.log('\n🔍 360°评分字段发现:');
console.log(`   - 总字段数: ${allFields.size}`);
Array.from(allFields).sort().forEach(field => {
  console.log(`   - ${field}`);
});

// 分析员工评价人映射
console.log('\n👥 员工360°评价人分析:');
const employeeReviewers = {};

data.forEach(record => {
  if (record.employeeName && record.employeeName !== '姓名') {
    const employeeName = record.employeeName;
    if (!employeeReviewers[employeeName]) {
      employeeReviewers[employeeName] = new Set();
    }
    
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        const match = key.match(/360°评分-(.*?)\(/);
        if (match) {
          const reviewer = match[1].trim();
          employeeReviewers[employeeName].add(reviewer);
        }
      }
    });
  }
});

// 统计评价人数量
Object.keys(employeeReviewers).forEach(employee => {
  const reviewers = Array.from(employeeReviewers[employee]);
  console.log(`   ${employee}: ${reviewers.length} 个评价人 - ${reviewers.join(', ')}`);
});

// 检查是否存在多评价人
const multiReviewerEmployees = Object.keys(employeeReviewers).filter(employee => 
  employeeReviewers[employee].size > 2
);

console.log('\n🎯 关键发现:');
console.log(`   - 有多个评价人的员工: ${multiReviewerEmployees.length} 个`);
if (multiReviewerEmployees.length > 0) {
  console.log(`   - 示例: ${multiReviewerEmployees.slice(0, 3).join(', ')}`);
}

console.log('\n=== 验证完成 ===');