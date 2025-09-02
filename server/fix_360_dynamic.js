const fs = require('fs');

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

// 为每个员工动态提取360°评价人
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.forEach(record => {
    // 动态提取该员工的真实360°评价人
    const reviewers = [];
    const reviewData = {};
    
    // 遍历该记录的所有字段，找出360°评分字段
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
        // 提取评价人姓名
        const match = key.match(/360°评分-([^（]+)（/);
        if (match) {
          const reviewer = match[1].trim();
          reviewers.push(reviewer);
          
          // 获取评分值和说明
          const scoreValue = record[key];
          const remarkKey = key.replace('（0.0%）', '评分说明');
          const remarkValue = record[remarkKey] || '';
          
          reviewData[reviewer] = {
            score: scoreValue,
            remark: remarkValue
          };
        }
      }
    });
    
    console.log(`${employeeName} 的360°评价人: ${reviewers.join(', ')}`);
    
    // 创建修复后的记录
    const newRecord = {
      ...record,
      review360: reviewData
    };
    
    // 只移除360°评分相关字段，保留其他所有字段
    Object.keys(newRecord).forEach(key => {
      if (key.includes('360°评分-') && (key.includes('（0.0%）') || key.includes('评分说明'))) {
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
    note: "360°评分已修复，评价人从每个员工的实际数据动态提取"
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_360_dynamic.json', JSON.stringify(output, null, 2));

console.log('\n=== 修复完成 ===');
console.log(`修复后总记录数: ${fixedData.length}`);

// 验证修复结果
console.log('\n=== 验证结果（每个员工的360°评价人） ===');
Object.keys(employeeGroups).forEach(employeeName => {
  const records = employeeGroups[employeeName];
  const firstRecord = records[0];
  
  const reviewers = [];
  Object.keys(firstRecord).forEach(key => {
    if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
      const match = key.match(/360°评分-([^（]+)（/);
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
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_dynamic.json', 'utf8'));

console.log('=== 360°评分动态修复验证 ===');
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

fs.writeFileSync('validate_360_dynamic.js', validationScript);
console.log('\n验证脚本已创建: validate_360_dynamic.js');