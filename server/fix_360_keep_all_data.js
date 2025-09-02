const fs = require('fs');

// 读取原始数据
const originalData = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

console.log('=== 开始修复360°评分 - 保留所有原始数据 ===');

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
      reviewers360: [],
      supervisorReviewer: null,
      headerRecord: record
    };
    
    // 从表头行的值中提取360°评价人和上级评价人
    Object.keys(record).forEach(key => {
      const value = record[key];
      if (value && typeof value === 'string') {
        // 提取360°评价人
        if (key.includes('360°评分-') && key.includes('（0.0%）') && !key.includes('评分说明')) {
          const match = value.match(/360°评分-([^（]+)（/);
          if (match) {
            tableHeaders[tableKey].reviewers360.push(match[1].trim());
          }
        }
        
        // 提取上级评价人
        if (key.includes('上级评分-') && key.includes('（100.0%）') && !key.includes('评分说明')) {
          const match = value.match(/上级评分-([^（]+)（/);
          if (match) {
            tableHeaders[tableKey].supervisorReviewer = match[1].trim();
          }
        }
      }
    });
    
    console.log(`${tableKey}: 360°评价人 = ${tableHeaders[tableKey].reviewers360.join(', ')}, 上级评价人 = ${tableHeaders[tableKey].supervisorReviewer}`);
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

// 重新处理每个员工的评分数据，保留所有原始信息
const fixedData = [];

Object.keys(employeeGroups).forEach(employeeName => {
  const employeeRecords = employeeGroups[employeeName];
  
  employeeRecords.forEach(record => {
    const tableKey = record._tableKey;
    const header = tableHeaders[tableKey];
    
    if (!header) {
      console.warn(`找不到表头信息: ${employeeName}`);
      return;
    }
    
    // 构建修复后的记录，保留所有原始数据
    const newRecord = {
      ...record
    };
    
    delete newRecord._tableKey;
    
    // 构建360°评分数据（保留原始字段）
    const review360 = {};
    header.reviewers360.forEach(reviewer => {
      const scoreKey = `360°评分-${reviewer}（0.0%）（0.0%）`;
      const remarkKey = `360°评分-${reviewer}评分说明`;
      
      const score = record[scoreKey];
      const remark = record[remarkKey];
      
      if (score !== undefined || remark !== undefined) {
        review360[reviewer] = {
          score: score || '',
          remark: remark || '',
          scoreKey: scoreKey,
          remarkKey: remarkKey
        };
      }
    });
    
    // 构建上级评价数据（保留原始字段）
    const supervisorReview = {};
    if (header.supervisorReviewer) {
      const reviewer = header.supervisorReviewer;
      const scoreKey = `上级评分-${reviewer}（100.0%）`;
      const remarkKey = `上级评分-${reviewer}评分说明`;
      
      const score = record[scoreKey];
      const remark = record[remarkKey];
      
      supervisorReview[reviewer] = {
        score: score || '',
        remark: remark || '',
        scoreKey: scoreKey,
        remarkKey: remarkKey
      };
    }
    
    // 添加结构化数据，但保留所有原始字段
    newRecord._review360 = review360;
    newRecord._supervisorReview = supervisorReview;
    newRecord._tableInfo = {
      tableKey: tableKey,
      reviewers360: header.reviewers360,
      supervisorReviewer: header.supervisorReviewer
    };
    
    fixedData.push(newRecord);
  });
});

// 保存修复后的数据
const output = {
  metadata: {
    ...originalData.metadata,
    totalRecords: fixedData.length,
    fixedAt: new Date().toISOString(),
    note: "360°评分和上级评价已修复，保留所有原始数据和字段",
    tableHeaders: tableHeaders
  },
  data: fixedData
};

fs.writeFileSync('data/performance/performance_fixed_keep_all_data.json', JSON.stringify(output, null, 2));

console.log(`\\n=== 修复完成 ===`);
console.log(`修复后总记录数: ${fixedData.length}`);
console.log(`修复后员工数: ${Object.keys(employeeGroups).length}`);

// 验证结果
console.log(`\\n=== 验证结果 ===`);
Object.keys(employeeGroups).slice(0, 5).forEach(name => {
  const records = employeeGroups[name];
  const tableKey = records[0]._tableKey;
  const header = tableHeaders[tableKey];
  console.log(`${name}:`);
  console.log(`  360°评价人: ${header.reviewers360.join(', ')}`);
  console.log(`  上级评价人: ${header.supervisorReviewer}`);
});

// 创建验证脚本
const validationScript = `
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_keep_all_data.json', 'utf8'));

console.log('=== 360°评分和上级评价保留验证 ===');
console.log('总记录数:', data.data.length);

// 检查前几个员工的评价数据
data.data.slice(0, 3).forEach(record => {
  console.log('\\n员工:', record.employeeName);
  console.log('360°评分:', record._review360);
  console.log('上级评价:', record._supervisorReview);
  
  // 检查原始字段是否保留
  const original360Fields = Object.keys(record).filter(key => key.includes('360°评分-'));
  const originalSupervisorFields = Object.keys(record).filter(key => key.includes('上级评分-'));
  
  console.log('保留的360°评分原始字段:', original360Fields);
  console.log('保留的上级评价原始字段:', originalSupervisorFields);
});

console.log('\\n验证完成！');
`;

fs.writeFileSync('validate_keep_all_data.js', validationScript);
console.log('\\n验证脚本已创建: validate_keep_all_data.js');