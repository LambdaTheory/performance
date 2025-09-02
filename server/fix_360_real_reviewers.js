const fs = require('fs');

// 读取原始数据
const originalData = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

console.log('=== 开始修复真实的360°评价人 ===');

const allRecords = originalData.data;

// 建立表头映射：根据表头行的值来识别每个员工对应的360°评价人
const tableHeaders = {};
let currentTableIndex = 0;

// 首先收集所有表头信息
allRecords.forEach(record => {
  if (record.employeeName === '姓名' && record.evaluationForm === '所在考评表') {
    currentTableIndex++;
    const tableKey = `表头${currentTableIndex}`;
    
    tableHeaders[tableKey] = {
      reviewers: [],
      headerRecord: record
    };
    
    // 从表头行的值中提取360°评价人（注意：值才是评价人姓名，键是固定格式）
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
        const reviewerName = record[key]; // 这里是实际的评价人姓名
        if (reviewerName && reviewerName !== '360°评分-') {
          tableHeaders[tableKey].reviewers.push(reviewerName.trim());
        }
      }
    });
    
    console.log(`${tableKey}: 360°评价人 = ${tableHeaders[tableKey].reviewers.join(', ')}`);
  }
});

// 按员工分组，并关联到正确的表头
const employeeGroups = {};
currentTableIndex = 0;
let currentTableKey = null;

allRecords.forEach(record => {
  if (record.employeeName === '姓名' && record.evaluationForm === '所在考评表') {
    currentTableIndex++;
    currentTableKey = `表头${currentTableIndex}`;
  } else if (record.employeeName && record.employeeName !== '姓名' && currentTableKey) {
    const name = record.employeeName.trim();
    if (!employeeGroups[name]) {
      employeeGroups[name] = [];
    }
    
    record._tableKey = currentTableKey;
    employeeGroups[name].push(record);
  }
});

console.log(`\\n员工数量: ${Object.keys(employeeGroups).length}`);

// 重新处理每个员工的360°评分
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.forEach(record => {
    const tableKey = record._tableKey;
    const reviewers = tableHeaders[tableKey] ? tableHeaders[tableKey].reviewers : [];
    
    console.log(`${employeeName} (${tableKey}): ${reviewers.join(', ')}`);
    
    // 构建修复后的记录
    const newRecord = {
      ...record
    };
    
    delete newRecord._tableKey;
    
    // 构建正确的360°评分数据
    const review360 = {};
    reviewers.forEach(reviewer => {
      // 注意：这里的键名格式需要重新构建
      const scoreKey = `360°评分-${reviewer}（0.0%）（0.0%）`;
      const remarkKey = `360°评分-${reviewer}评分说明`;
      
      const score = record[scoreKey];
      const remark = record[remarkKey] || '';
      
      if (score !== undefined) {
        review360[reviewer] = {
          score: score,
          remark: remark
        };
      }
    });
    
    newRecord.review360 = review360;
    
    // 清理旧的360°评分字段
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
    note: "360°评分已修复，使用每个员工对应表头的真实评价人",
    tableHeaders: tableHeaders
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_360_real_reviewers.json', JSON.stringify(output, null, 2));

console.log(`\\n=== 修复完成 ===`);
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeGroups).length}`);

// 验证结果
console.log(`\\n=== 验证结果 ===`);
Object.keys(employeeGroups).forEach(name => {
  const records = employeeGroups[name];
  const tableKey = records[0]._tableKey;
  const reviewers = tableHeaders[tableKey] ? tableHeaders[tableKey].reviewers : [];
  console.log(`${name}: ${reviewers.join(', ')}`);
});

// 创建验证脚本
const validationScript = `
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_real_reviewers.json', 'utf8'));

console.log('=== 360°评分真实评价人验证 ===');
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

console.log('员工360°评价人分布:');
Object.keys(employeeReviewers).forEach(name => {
  const scores = employeeReviewers[name];
  const reviewers = Object.keys(scores);
  console.log(\`\${name}: \${reviewers.join(', ')}\`);
});

console.log('验证完成！');
`;

fs.writeFileSync('validate_360_real_reviewers.js', validationScript);
console.log('\\n验证脚本已创建: validate_360_real_reviewers.js');