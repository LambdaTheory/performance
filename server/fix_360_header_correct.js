const fs = require('fs');

// 读取原始数据
const originalData = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

console.log('=== 开始修复360°评分header问题 ===');

// 重新分析数据结构，找出正确的表头行
const allRecords = originalData.data;

// 找出所有有效的表头行（包含"所在考评表"且employeeName为"姓名"的行）
const headerRows = allRecords.filter(record => 
  record.employeeName === '姓名' && 
  record.evaluationForm === '所在考评表'
);

console.log(`找到 ${headerRows.length} 个表头行`);

// 按员工重新组织数据
const employeeGroups = {};
const tableHeaders = {}; // 存储每个表的表头信息

// 首先识别每个小表的表头
let currentHeader = null;
let currentTableName = null;

allRecords.forEach(record => {
  if (record.employeeName === '姓名' && record.evaluationForm === '所在考评表') {
    // 这是一个新的表头行
    currentHeader = record;
    currentTableName = record.evaluationForm || '默认考评表';
    tableHeaders[currentTableName] = {
      header: record,
      reviewers360: []
    };
    
    // 从表头提取360°评价人
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
        const match = key.match(/360°评分-([^（]+)（/);
        if (match) {
          tableHeaders[currentTableName].reviewers360.push(match[1].trim());
        }
      }
    });
    
    console.log(`表头: ${currentTableName}, 360°评价人: ${tableHeaders[currentTableName].reviewers360.join(', ')}`);
  } else if (record.employeeName && record.employeeName !== '姓名') {
    // 这是员工数据
    const name = record.employeeName.trim();
    if (!employeeGroups[name]) {
      employeeGroups[name] = [];
    }
    
    // 将记录与其对应的表头关联
    record._tableHeader = currentHeader;
    record._tableName = currentTableName;
    employeeGroups[name].push(record);
  }
});

console.log(`\\n员工数量: ${Object.keys(employeeGroups).length}`);

// 重新处理每个员工的360°评分
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.forEach(record => {
    const tableName = record._tableName;
    const header = record._tableHeader;
    const reviewers = tableHeaders[tableName] ? tableHeaders[tableName].reviewers360 : [];
    
    console.log(`${employeeName} (${tableName}): ${reviewers.join(', ')}`);
    
    // 构建修复后的记录
    const newRecord = {
      ...record
    };
    
    // 移除临时字段
    delete newRecord._tableHeader;
    delete newRecord._tableName;
    
    // 构建正确的360°评分数据
    const review360 = {};
    reviewers.forEach(reviewer => {
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
    note: "360°评分已修复，使用正确的表头识别方法",
    tableHeaders: tableHeaders
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_360_header_correct.json', JSON.stringify(output, null, 2));

console.log(`\\n=== 修复完成 ===`);
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeGroups).length}`);

// 验证结果
console.log(`\\n=== 验证结果 ===`);
Object.keys(employeeGroups).forEach(name => {
  const records = employeeGroups[name];
  const tableName = records[0]._tableName;
  const reviewers = tableHeaders[tableName] ? tableHeaders[tableName].reviewers360 : [];
  console.log(`${name}: ${reviewers.join(', ')}`);
});

// 创建验证脚本
const validationScript = `
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_360_header_correct.json', 'utf8'));

console.log('=== 360°评分header修复验证 ===');
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

fs.writeFileSync('validate_360_header_correct.js', validationScript);
console.log('\\n验证脚本已创建: validate_360_header_correct.js');