const fs = require('fs');
const path = require('path');

// 读取原始数据
const originalData = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

// 过滤掉表头行
const validRecords = originalData.data.filter(record => 
  record.employeeName && 
  record.employeeName !== '姓名' && 
  record.employeeName.trim() !== ''
);

console.log(`原始总记录数: ${originalData.data.length}`);
console.log(`有效记录数: ${validRecords.length}`);

// 按员工分组
const employeeGroups = {};
validRecords.forEach(record => {
  const name = record.employeeName.trim();
  if (!employeeGroups[name]) {
    employeeGroups[name] = [];
  }
  employeeGroups[name].push(record);
});

console.log(`员工数量: ${Object.keys(employeeGroups).length}`);

// 定义固定的360°评价人（根据实际数据）
const reviewers360 = ['刘志润', '郑志宏'];

// 为每个员工修复360°评分数据
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.forEach(record => {
    const newRecord = {
      ...record,
      // 清理并重建360°评分结构
      review360: {}
    };
    
    // 为每个评价人提取评分
    reviewers360.forEach(reviewer => {
      // 构建正确的字段名
      const scoreKey = `360°评分-${reviewer}（0.0%）（0.0%）`;
      const remarkKey = `360°评分-${reviewer}评分说明`;
      
      const scoreValue = record[scoreKey];
      const remarkValue = record[remarkKey] || '';
      
      if (scoreValue !== undefined) {
        newRecord.review360[reviewer] = {
          score: scoreValue,
          remark: remarkValue
        };
      }
    });
    
    // 移除旧的360°评分字段
    Object.keys(newRecord).forEach(key => {
      if (key.startsWith('360°评分-') && (key.includes('（0.0%）') || key.includes('评分说明'))) {
        delete newRecord[key];
      }
    });
    
    fixedData.push(newRecord);
  });
});

// 保存修复后的数据
const output = {
  metadata: {
    ...originalData.metadata,
    totalRecords: fixedData.length,
    fixedAt: new Date().toISOString(),
    note: "360°评分已修复，评价人：刘志润、郑志宏，正确提取评分值"
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_360_final.json', JSON.stringify(output, null, 2));

console.log('\n=== 修复完成 ===');
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeGroups).length}`);

// 验证修复结果
console.log('\n=== 验证结果（前5个员工） ===');
Object.keys(employeeGroups).slice(0, 5).forEach(employeeName => {
  const records = employeeGroups[employeeName];
  const firstRecord = records[0];
  
  console.log(`\n${employeeName}:`);
  reviewers360.forEach(reviewer => {
    const scoreKey = `360°评分-${reviewer}（0.0%）（0.0%）`;
    const score = firstRecord[scoreKey];
    console.log(`  ${reviewer}: ${score || '无数据'}`);
  });
});

// 创建最终验证脚本
const validationScript = `
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_final.json', 'utf8'));

console.log('=== 360°评分最终验证 ===');
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

console.log('员工360°评分分布:');
Object.keys(employeeReviewers).forEach(name => {
  const scores = employeeReviewers[name];
  const scoreStr = Object.keys(scores).map(r => \`\${r}:\${scores[r]}\`).join(', ');
  console.log(\`\${name}: \${scoreStr}\`);
});

console.log('验证完成！');
`;

fs.writeFileSync('validate_360_final.js', validationScript);
console.log('\n最终验证脚本已创建: validate_360_final.js');