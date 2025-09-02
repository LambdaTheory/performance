const fs = require('fs');
const path = require('path');

console.log('=== 修复360°数据导入逻辑 ===');

// 读取原始数据文件
const dataFiles = [
  'data/performance/performance_1756455779537.json',
  'data/performance/performance_1756699793319.json',
  'data/performance/performance_fixed_real_360.json'
];

let originalData = null;
let sourceFile = null;

for (const file of dataFiles) {
  if (fs.existsSync(file)) {
    originalData = JSON.parse(fs.readFileSync(file, 'utf8'));
    sourceFile = file;
    console.log(`使用数据文件: ${file}`);
    break;
  }
}

if (!originalData) {
  console.error('未找到可用的数据文件');
  process.exit(1);
}

// 获取所有记录
const allRecords = originalData.data || [];
console.log(`原始记录数: ${allRecords.length}`);

// 建立表头映射：根据tableHeaders信息来识别每个员工对应的360°评价人
const tableHeadersMap = {};

// 如果数据中包含tableHeaders，直接使用
if (originalData.tableHeaders) {
  originalData.tableHeaders.forEach((header, index) => {
    const tableKey = `table_${index}`;
    tableHeadersMap[tableKey] = {
      index: index,
      reviewers: header.reviewers || [],
      headerRecord: header.headerRecord || {}
    };
    
    console.log(`表头 ${index}: 360°评价人 = ${(header.reviewers || []).join(', ')}`);
  });
} else {
  // 否则从记录中提取表头信息
  let currentTableIndex = 0;
  
  allRecords.forEach(record => {
    if (record.employeeName === '姓名' && record.evaluationForm === '所在考评表') {
      const tableKey = `table_${currentTableIndex}`;
      
      tableHeadersMap[tableKey] = {
        index: currentTableIndex,
        reviewers: [],
        headerRecord: record
      };
      
      // 从表头行的值中提取360°评价人
      Object.keys(record).forEach(key => {
        if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
          const reviewerName = record[key];
          if (reviewerName && reviewerName !== '360°评分-' && reviewerName !== '') {
            tableHeadersMap[tableKey].reviewers.push(reviewerName.trim());
          }
        }
      });
      
      console.log(`表头 ${currentTableIndex}: 360°评价人 = ${tableHeadersMap[tableKey].reviewers.join(', ')}`);
      currentTableIndex++;
    }
  });
}

// 按员工分组，并关联到正确的表头
const employeeGroups = {};
let currentTableIndex = 0;
let currentTableKey = null;

allRecords.forEach(record => {
  if (record.employeeName === '姓名' && record.evaluationForm === '所在考评表') {
    currentTableIndex++;
    currentTableKey = `table_${currentTableIndex - 1}`;
  } else if (record.employeeName && record.employeeName !== '姓名' && currentTableKey) {
    const name = record.employeeName.trim();
    if (!employeeGroups[name]) {
      employeeGroups[name] = [];
    }
    
    // 添加表头索引信息
    record._tableKey = currentTableKey;
    record._tableIndex = currentTableIndex - 1;
    employeeGroups[name].push(record);
  }
});

console.log(`\n员工数量: ${Object.keys(employeeGroups).length}`);

// 重新处理每个员工的360°评分
const fixedData = [];
const employeeSummary = {};

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  // 获取该员工使用的表头
  const firstRecord = employeeRecords[0];
  const tableKey = firstRecord._tableKey;
  const tableIndex = firstRecord._tableIndex;
  const tableHeader = tableHeadersMap[tableKey];
  
  if (!tableHeader) {
    console.log(`警告: ${employeeName} 没有找到对应的表头信息`);
    return;
  }
  
  const reviewers = tableHeader.reviewers;
  console.log(`${employeeName} (表头 ${tableIndex}): ${reviewers.join(', ')}`);
  
  // 为每个员工创建汇总信息
  employeeSummary[employeeName] = {
    name: employeeName,
    tableIndex: tableIndex,
    reviewers360: reviewers,
    records: [],
    review360: {}
  };
  
  // 处理该员工的每条记录
  employeeRecords.forEach(record => {
    const newRecord = {
      ...record
    };
    
    // 删除临时字段
    delete newRecord._tableKey;
    delete newRecord._tableIndex;
    
    // 构建正确的360°评分数据
    const review360 = {};
    
    reviewers.forEach(reviewer => {
      // 根据表头记录中的映射关系找到正确的字段名
      const headerRecord = tableHeader.headerRecord;
      let scoreKey = null;
      let remarkKey = null;
      
      // 在表头记录中查找对应的字段名
      Object.keys(headerRecord).forEach(key => {
        if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
          const mappedReviewer = headerRecord[key];
          if (mappedReviewer === reviewer) {
            scoreKey = key;
            remarkKey = key.replace('（0.0%）（0.0%）', '评分说明');
          }
        }
      });
      
      // 如果找到了对应的字段，提取数据
      if (scoreKey) {
        const score = record[scoreKey];
        const remark = record[remarkKey] || '';
        
        if (score !== undefined && score !== '') {
          review360[reviewer] = {
            score: score,
            remark: remark
          };
        }
      }
    });
    
    newRecord.review360 = review360;
    
    // 清理旧的360°评分字段（保留原始数据用于验证）
    // 注释掉清理逻辑，保留原始字段用于调试
    /*
    Object.keys(newRecord).forEach(key => {
      if (key.includes('360°评分-') && (key.includes('（0.0%）') || key.includes('评分说明'))) {
        delete newRecord[key];
      }
    });
    */
    
    fixedData.push(newRecord);
    employeeSummary[employeeName].records.push(newRecord);
    
    // 合并360°评分数据
    Object.keys(review360).forEach(reviewer => {
      employeeSummary[employeeName].review360[reviewer] = review360[reviewer];
    });
  });
});

// 保存修复后的数据
const output = {
  metadata: {
    ...originalData.metadata,
    totalRecords: fixedData.length,
    fixedAt: new Date().toISOString(),
    sourceFile: sourceFile,
    note: "360°评分已修复，使用正确的表头映射关系",
    tableHeaders: tableHeadersMap
  },
  employees: Object.values(employeeSummary),
  data: fixedData
};

const outputFile = 'data/performance/performance_fixed_import_logic.json';
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log(`\n=== 修复完成 ===`);
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeSummary).length}`);
console.log(`输出文件: ${outputFile}`);

// 验证结果
console.log(`\n=== 验证结果 ===`);
Object.keys(employeeSummary).forEach(name => {
  const summary = employeeSummary[name];
  const reviewers = Object.keys(summary.review360);
  console.log(`${name} (表头 ${summary.tableIndex}): 声明的评价人 [${summary.reviewers360.join(', ')}], 实际评分人 [${reviewers.join(', ')}]`);
});

// 创建验证脚本
const validationScript = `
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('${outputFile}', 'utf8'));

console.log('=== 360°评分导入逻辑修复验证 ===');
console.log('总记录数:', data.data.length);
console.log('员工数:', data.employees.length);

const issues = [];

data.employees.forEach(employee => {
  const name = employee.name;
  const declaredReviewers = employee.reviewers360 || [];
  const actualReviewers = Object.keys(employee.review360 || {});
  
  console.log("\\n" + name + " (表头 " + employee.tableIndex + "):");
  console.log("  声明的评价人: [" + declaredReviewers.join(', ') + "]");
  console.log("  实际评分人: [" + actualReviewers.join(', ') + "]");
  
  // 检查是否一致
  const missingReviewers = declaredReviewers.filter(r => !actualReviewers.includes(r));
  const extraReviewers = actualReviewers.filter(r => !declaredReviewers.includes(r));
  
  if (missingReviewers.length > 0) {
    console.log("  ❌ 缺少评价人: [" + missingReviewers.join(', ') + "]");
    issues.push({name, issue: '缺少评价人', reviewers: missingReviewers});
  }
  
  if (extraReviewers.length > 0) {
    console.log("  ⚠️  额外评价人: [" + extraReviewers.join(', ') + "]");
    issues.push({name, issue: '额外评价人', reviewers: extraReviewers});
  }
  
  if (missingReviewers.length === 0 && extraReviewers.length === 0) {
    console.log("  ✅ 评价人一致");
  }
});

console.log("\\n=== 问题汇总 ===");
console.log("发现问题: " + issues.length + "个");
issues.forEach(issue => {
  console.log("  " + issue.name + ": " + issue.issue + " - [" + issue.reviewers.join(', ') + "]");
});

if (issues.length === 0) {
  console.log('✅ 所有员工的360°评价人数据都正确！');
} else {
  console.log('❌ 发现问题，需要进一步检查数据导入逻辑');
}

console.log('验证完成！');
`;

fs.writeFileSync('validate_fixed_import_logic.js', validationScript);
console.log('\n验证脚本已创建: validate_fixed_import_logic.js');
console.log('运行命令: node validate_fixed_import_logic.js');