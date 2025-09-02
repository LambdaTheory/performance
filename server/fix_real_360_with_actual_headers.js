const fs = require('fs');
const path = require('path');

// 读取最新的数据文件
const dataPath = path.join(__dirname, 'data', 'performance', 'performance_1756699793319.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const originalData = JSON.parse(rawData);

console.log('=== 开始修复360°评价人信息 ===');
console.log(`原始数据总记录数: ${originalData.data.length}`);

// 找出所有表头行和对应的360°评价人
const tableHeaders = [];
let currentHeader = null;
let headerIndex = 0;

originalData.data.forEach((row, index) => {
  if (row.employeeName === '姓名' || row.evaluationForm === '所在考评表') {
    // 这是一个新的表头行
    headerIndex++;
    const reviewers = [];
    const fieldMappings = {};
    
    // 收集360°评价人字段映射
    Object.keys(row).forEach(key => {
      if (key.includes('360°评分-') && !key.includes('评分说明')) {
        const actualReviewer = row[key];
        if (actualReviewer && actualReviewer !== key) {
          // 提取实际评价人姓名
          const reviewerName = actualReviewer.replace('360°评分-', '').replace('（0.0%）', '');
          if (reviewerName && reviewerName !== actualReviewer) {
            reviewers.push(reviewerName);
            fieldMappings[key] = {
              reviewer: reviewerName,
              scoreKey: key,
              remarkKey: key.replace('（0.0%）（0.0%）', '评分说明').replace('（0.0%）', '评分说明')
            };
          }
        }
      }
    });
    
    currentHeader = {
      index: headerIndex,
      reviewers: reviewers,
      fieldMappings: fieldMappings,
      headerRow: row
    };
    tableHeaders.push(currentHeader);
    
    console.log(`表头 ${headerIndex}: 评价人 = ${reviewers.join(', ')}`);
  }
});

// 按员工分组并应用正确的360°评价人
const employees = {};
let currentTableHeader = null;
let headerCounter = 0;

originalData.data.forEach((row, index) => {
  if (row.employeeName === '姓名' || row.evaluationForm === '所在考评表') {
    // 切换到新的表头
    currentTableHeader = tableHeaders[headerCounter];
    headerCounter++;
    return; // 跳过表头行
  }
  
  if (!row.employeeName || row.employeeName === '姓名') return;
  
  const empName = row.employeeName;
  if (!employees[empName]) {
    employees[empName] = {
      name: empName,
      records: [],
      reviewers360: currentTableHeader ? currentTableHeader.reviewers : [],
      tableHeaderIndex: currentTableHeader ? currentTableHeader.index : 0
    };
  }
  
  // 构建包含正确360°评价人的记录
  const newRecord = {
    ...row,
    review360: {}
  };
  
  if (currentTableHeader) {
    // 提取360°评分数据
    currentTableHeader.reviewers.forEach(reviewer => {
      const scoreKey = Object.keys(row).find(k => k.includes(`360°评分-${reviewer}`));
      const remarkKey = Object.keys(row).find(k => k.includes(`360°评分-${reviewer}评分说明`));
      
      if (scoreKey && row[scoreKey]) {
        newRecord.review360[reviewer] = {
          score: row[scoreKey],
          remark: remarkKey ? row[remarkKey] : '',
          scoreKey: scoreKey,
          remarkKey: remarkKey,
          originalScoreField: scoreKey,
          originalRemarkField: remarkKey
        };
      }
    });
  }
  
  employees[empName].records.push(newRecord);
});

// 构建最终数据结构
const result = {
  metadata: {
    originalFilename: originalData.metadata.originalFilename,
    detectedPeriods: originalData.metadata.detectedPeriods,
    totalRecords: originalData.data.filter(row => row.employeeName && row.employeeName !== '姓名').length,
    totalEmployees: Object.keys(employees).length,
    tableHeaders: tableHeaders.map(th => ({
      index: th.index,
      reviewers: th.reviewers,
      headerRecord: th.headerRow
    }))
  },
  employees: Object.values(employees)
};

// 保存修复后的数据
const outputPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`\n=== 修复完成 ===`);
console.log(`总员工数: ${result.metadata.totalEmployees}`);
console.log(`总记录数: ${result.metadata.totalRecords}`);
console.log(`表头数: ${tableHeaders.length}`);

// 验证每个员工的360°评价人
console.log('\n=== 员工360°评价人分布验证 ===');
Object.values(employees).forEach(emp => {
  console.log(`${emp.name}: ${emp.reviewers360.join(', ')} (表头${emp.tableHeaderIndex})`);
});

// 创建验证脚本
const validateScript = `
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== 验证360°评价人修复结果 ===');
console.log(\`总记录数: \${data.metadata.totalRecords}\`);
console.log(\`总员工数: \${data.metadata.totalEmployees}\`);

console.log('\\n=== 员工360°评价人分布 ===');
data.employees.forEach(emp => {
  console.log(\`\${emp.name}: \${emp.reviewers360.join(', ')}\`);
});

console.log('\\n验证完成！');
`;

fs.writeFileSync('validate_real_360.js', validateScript);
console.log('\n验证脚本已创建: validate_real_360.js');