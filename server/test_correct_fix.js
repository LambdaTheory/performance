const fs = require('fs');

console.log('=== 测试360°评分字段正确修复 ===\n');

// 模拟测试数据
const mockHeaders = [
  '姓名', '工号', '部门', '所在考评表', '维度名称', '指标名称', '360°评分-刘志润（0.0%）', '360°评分-刘志润评分说明', '360°评分-郑志宏（0.0%）', '360°评分-郑志宏评分说明'
];

const mockRows = [
  ['孙文秦', '1001', '我游科技', '季度绩效考核表', '工作业绩', '工作业绩', 'M', '积极跟进原画修改...', 'M', '专业能力强...'],
  ['刘志润', '1002', '设计部', '季度绩效考核表', '工作业绩', '工作业绩', 'M+', '沟通坦诚...', 'M', '认真负责...'],
  ['曾若韵', '1003', '设计部', '季度绩效考核表', '工作业绩', '工作业绩', 'M', '交互稿完成度高...', 'M+', '系统化规范...']
];

// 模拟ExcelParserService的核心方法
function mapColumns(headers) {
  const map = {};
  map.peerEvaluationFields = [];
  
  headers.forEach((header, index) => {
    const originalHeader = String(header || '').trim();
    
    if (originalHeader === '姓名') {
      map.name = index;
    } else if (originalHeader === '工号') {
      map.employeeId = index;
    } else if (originalHeader === '部门') {
      map.department = index;
    } else if (originalHeader === '所在考评表') {
      map.evaluationForm = index;
    } else if (originalHeader === '维度名称') {
      map.dimensionName = index;
    } else if (originalHeader === '指标名称') {
      map.indicatorName = index;
    } else if (originalHeader.startsWith('360°评分-')) {
      if (originalHeader.includes('评分说明')) {
        map.peerEvaluationFields.push({
          key: originalHeader,
          index: index,
          type: 'remark'
        });
      } else {
        map.peerEvaluationFields.push({
          key: originalHeader,
          index: index,
          type: 'result'
        });
      }
    }
  });
  
  return map;
}

function parsePerformanceData(headers, rows, period) {
  const data = [];
  const columnMap = mapColumns(headers);
  
  rows.forEach((row, i) => {
    const employeeName = row[columnMap.name];
    const employeeId = row[columnMap.employeeId];
    const department = row[columnMap.department];
    const evaluationForm = row[columnMap.evaluationForm];
    const dimensionName = row[columnMap.dimensionName];
    const indicatorName = row[columnMap.indicatorName];
    
    if (!employeeName || employeeName === '姓名') return;
    
    const record = {
      employeeName,
      employeeId,
      department,
      evaluationForm,
      dimensionName,
      indicatorName,
      evaluationPeriod: period
    };
    
    // 处理360°评分字段
    const resultFields = columnMap.peerEvaluationFields.filter(f => f.type === 'result');
    const remarkFields = columnMap.peerEvaluationFields.filter(f => f.type === 'remark');
    
    resultFields.forEach(resultField => {
      const scoreValue = row[resultField.index];
      if (scoreValue && scoreValue !== '') {
        const originalHeader = resultField.key;
        const reviewerMatch = originalHeader.match(/360°评分-(.*?)\(|360°评分-(.*?)（/);
        if (reviewerMatch) {
          const reviewerName = reviewerMatch[1].replace(/（[^）]*）/g, '').trim();
          
          record[`360°评分-${reviewerName}`] = scoreValue;
          
          const correspondingRemark = remarkFields.find(remarkField => {
            const remarkHeader = remarkField.key;
            return remarkHeader.includes(reviewerName) && remarkHeader.includes('评分说明');
          });
          
          if (correspondingRemark) {
            const remarkValue = row[correspondingRemark.index];
            record[`360°评分-${reviewerName}评分说明`] = remarkValue;
          }
        }
      }
    });
    
    data.push(record);
  });
  
  return data;
}

// 运行测试
console.log('1. 表头映射:');
const columnMap = mapColumns(mockHeaders);
console.log('   peerEvaluationFields:', columnMap.peerEvaluationFields.length);

console.log('\n2. 解析结果:');
const result = parsePerformanceData(mockHeaders, mockRows, '2025年第1季度');

result.forEach(record => {
    console.log(`\n员工: ${record.employeeName}`);
    
    const peerFields = Object.keys(record).filter(key => key.includes('360°评分'));
    if (peerFields.length === 0) {
      console.log('  无360°评分字段');
    } else {
      peerFields.forEach(field => {
        console.log(`  ${field}: ${record[field]}`);
      });
    }
  });

console.log('\n3. 统计:');
console.log(`总记录数: ${result.length}`);
console.log(`有效员工记录: ${result.filter(r => r.employeeName && r.employeeName !== '姓名').length}`);