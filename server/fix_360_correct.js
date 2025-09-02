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

console.log(`总记录数: ${originalData.data.length}`);
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
console.log('员工列表:', Object.keys(employeeGroups));

// 为每个员工提取正确的360°评价人
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  // 从第一条记录中提取360°评价人
  const firstRecord = employeeRecords[0];
  
  // 动态提取360°评价人
  const reviewers360 = [];
  const reviewScores = {};
  
  // 遍历所有可能的360°评分字段
  Object.keys(firstRecord).forEach(key => {
    if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
      // 提取评价人姓名
      const match = key.match(/360°评分-([^（]+)/);
      if (match) {
        const reviewerName = match[1].trim();
        reviewers360.push(reviewerName);
        
        // 获取对应的评分值
        const scoreValue = firstRecord[key];
        const remarkKey = key.replace('360°评分-', '360°评分-') + '评分说明';
        const remarkValue = firstRecord[remarkKey] || '';
        
        reviewScores[reviewerName] = {
          score: scoreValue,
          remark: remarkValue
        };
      }
    }
  });
  
  console.log(`\n员工: ${employeeName}`);
  console.log(`360°评价人: ${reviewers360.join(', ')}`);
  
  // 处理每条记录
  employeeRecords.forEach(record => {
    const newRecord = {
      ...record,
      // 清理360°评分字段
      review360: {}
    };
    
    // 为每个评价人提取正确的评分
    reviewers360.forEach(reviewer => {
      // 寻找正确的字段名
      const possibleKeys = Object.keys(record).filter(key => 
        key.includes(`360°评分-${reviewer}`) && 
        key.includes('（0.0%）') && 
        !key.includes('评分说明')
      );
      
      if (possibleKeys.length > 0) {
        const scoreKey = possibleKeys[0]; // 使用第一个匹配的字段
        const remarkKey = scoreKey + '评分说明';
        
        newRecord.review360[reviewer] = {
          score: record[scoreKey] || '',
          remark: record[remarkKey] || ''
        };
      }
    });
    
    // 移除旧的360°评分字段
    Object.keys(newRecord).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）')) {
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
    note: "360°评分字段已修复，评价人从实际数据中提取"
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_360_correct.json', JSON.stringify(output, null, 2));

console.log('\n=== 修复完成 ===');
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeGroups).length}`);

// 验证修复结果
console.log('\n=== 验证结果 ===');
Object.keys(employeeGroups).slice(0, 5).forEach(employeeName => {
  const records = employeeGroups[employeeName];
  const firstRecord = records[0];
  
  // 重新提取评价人
  const reviewers = [];
  Object.keys(firstRecord).forEach(key => {
    if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
      const match = key.match(/360°评分-([^（]+)/);
      if (match) {
        reviewers.push(match[1].trim());
      }
    }
  });
  
  console.log(`${employeeName}: ${reviewers.join(', ')}`);
});

// 创建验证脚本
const validationScript = `
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
  console.log(\`\${name}: \${Array.from(employeeReviewers[name]).join(', ')}\`);
});

console.log('验证完成！');
`;

fs.writeFileSync('validate_360_correct.js', validationScript);
console.log('\n验证脚本已创建: validate_360_correct.js');