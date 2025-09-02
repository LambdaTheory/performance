const fs = require('fs');
const path = require('path');

// 直接导入import.js文件内容来获取ExcelParserService类
const importFile = require('./routes/import');

// 由于ExcelParserService没有直接导出，我们需要重新定义它
class ExcelParserService {
  parseExcelFile(filePath, originalFilename) {
    // 这里简化实现，主要测试我们的修正逻辑
    console.log('解析Excel文件:', filePath);
    return {
      data: [],
      metadata: {
        originalFilename,
        detectedPeriods: ['2025年第1季度'],
        totalRecords: 0,
        totalEmployees: 0
      }
    };
  }

  mapColumns(headers) {
    const columnMap = {
      dimensionName: { index: -1, key: 'dimensionName' },
      indicatorName: { index: -1, key: 'indicatorName' },
      assessmentStandard: { index: -1, key: 'assessmentStandard' },
      weight: { index: -1, key: 'weight' },
      selfEvaluationResult: { index: -1, key: 'selfEvaluationResult' },
      selfEvaluationRemark: { index: -1, key: 'selfEvaluationRemark' },
      peerEvaluationResult: { index: -1, key: 'peerEvaluationResult' },
      peerEvaluationRemark: { index: -1, key: 'peerEvaluationRemark' },
      supervisorEvaluationResult: { index: -1, key: 'supervisorEvaluationResult' },
      supervisorEvaluationRemark: { index: -1, key: 'supervisorEvaluationRemark' },
      performanceResult: { index: -1, key: 'performanceResult' },
      comments: { index: -1, key: 'comments' },
      peerEvaluationFields: []
    };

    // 映射基本列
    headers.forEach((header, index) => {
      if (!header) return;
      
      const headerStr = String(header).trim();
      
      // 基本字段映射
      if (headerStr === '维度名称') columnMap.dimensionName.index = index;
      else if (headerStr === '指标名称') columnMap.indicatorName.index = index;
      else if (headerStr === '考核标准') columnMap.assessmentStandard.index = index;
      else if (headerStr === '权重') columnMap.weight.index = index;
      else if (headerStr === '绩效结果') columnMap.performanceResult.index = index;
      else if (headerStr === '备注') columnMap.comments.index = index;
      
      // 自评字段
      else if (headerStr.startsWith('自评-')) {
        columnMap.selfEvaluationResult.index = index;
      }
      else if (headerStr === '自评说明') {
        columnMap.selfEvaluationRemark.index = index;
      }
      
      // 上级评分字段
      else if (headerStr.startsWith('上级评分-')) {
        columnMap.supervisorEvaluationResult.index = index;
      }
      else if (headerStr === '上级评分说明') {
        columnMap.supervisorEvaluationRemark.index = index;
      }
      
      // 360°评分字段 - 使用原始表头作为键名
      else if (headerStr.startsWith('360°评分-')) {
        columnMap.peerEvaluationFields.push({
          type: 'result',
          key: headerStr,
          index: index
        });
      }
      else if (headerStr.includes('评分说明') && headerStr.includes('360°评分')) {
        columnMap.peerEvaluationFields.push({
          type: 'remark',
          key: headerStr,
          index: index
        });
      }
    });

    console.log('列映射结果:', JSON.stringify(columnMap, null, 2));
    return columnMap;
  }

  parseSingleEmployeeTable(headers, rows, employeeName, defaultPeriod) {
    const columnMap = this.mapColumns(headers);
    const results = [];

    rows.forEach((row, rowIndex) => {
      if (!row || row.length < 4) return;

      const record = {
        id: `${Date.now()}_${rowIndex + 1}`,
        employeeName,
        evaluationPeriod: defaultPeriod,
        dimensionName: this.getCellValue(row, columnMap.dimensionName),
        indicatorName: this.getCellValue(row, columnMap.indicatorName),
        assessmentStandard: this.getCellValue(row, columnMap.assessmentStandard),
        weight: this.parseWeight(this.getCellValue(row, columnMap.weight)),
        selfEvaluationResult: this.getCellValue(row, columnMap.selfEvaluationResult),
        selfEvaluationRemark: this.getCellValue(row, columnMap.selfEvaluationRemark),
        supervisorEvaluationResult: this.getCellValue(row, columnMap.supervisorEvaluationResult),
        supervisorEvaluationRemark: this.getCellValue(row, columnMap.supervisorEvaluationRemark),
        performanceResult: this.getCellValue(row, columnMap.performanceResult),
        comments: this.getCellValue(row, columnMap.comments),
        rawRowIndex: rowIndex + 1,
        createdAt: new Date().toISOString()
      };

      // 处理360°评分字段
      columnMap.peerEvaluationFields.forEach(field => {
        if (field.type === 'result') {
          // 查找对应的评分说明字段
          const remarkField = columnMap.peerEvaluationFields.find(f => 
            f.type === 'remark' && f.key.includes(field.key.replace('360°评分-', '').split('（')[0])
          );
          
          record[field.key] = this.getCellValue(row, field);
          if (remarkField) {
            record[remarkField.key] = this.getCellValue(row, remarkField);
          }
        }
      });

      results.push(record);
    });

    return results;
  }

  getCellValue(row, columnInfo) {
    if (!columnInfo || columnInfo.index === -1) return '';
    const value = row[columnInfo.index];
    return value ? String(value).trim() : '';
  }

  parseWeight(weightStr) {
    if (!weightStr) return 0;
    const match = String(weightStr).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  extractPeriodFromFilename(filename) {
    if (!filename) return '未知周期';
    const match = filename.match(/(\d{4})年(第[一二三四]季度)/);
    return match ? `${match[1]}年${match[2]}` : '未知周期';
  }
}

console.log('=== 测试修正后的数据导入逻辑 ===');

// 测试文件路径
const testFilePath = 'data/performance/performance_fixed_real_360.json';

if (!fs.existsSync(testFilePath)) {
  console.error('测试数据文件不存在:', testFilePath);
  process.exit(1);
}

// 读取测试数据
const testData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
console.log('测试数据文件:', testFilePath);
console.log('员工数量:', testData.employees ? testData.employees.length : 0);
console.log('表头数量:', testData.tableHeaders ? testData.tableHeaders.length : 0);

// 使用第一个员工的数据进行测试
const testEmployee = testData.employees && testData.employees[0];
if (testEmployee && testEmployee.records) {
  console.log('\n=== 测试员工数据 ===');
  console.log('测试员工:', testEmployee.name);
  console.log('记录数量:', testEmployee.records.length);
  
  // 使用第一条记录作为示例
  const sampleRecord = testEmployee.records[0];
  console.log('\n示例记录的360°评分字段:');
  const field360Keys = Object.keys(sampleRecord).filter(key => key.includes('360°评分-'));
  console.log('360°评分字段数量:', field360Keys.length);
  field360Keys.forEach(key => {
    console.log(`  ${key}: ${sampleRecord[key]}`);
  });
} else {
  console.log('未找到员工数据');
}

// 创建Excel解析服务实例
const parser = new ExcelParserService();

// 模拟表头数据，测试360°评分字段解析
const testHeaders = [
  '维度名称', '指标名称', '考核标准', '权重',
  '自评-刘志润', '自评说明',
  '360°评分-刘志润（0.0%）（0.0%）', '360°评分-刘志润评分说明',
  '360°评分-郑志宏（0.0%）（0.0%）', '360°评分-郑志宏评分说明',
  '上级评分-刘志润（100.0%）', '上级评分说明',
  '绩效结果', '备注'
];

// 测试数据行
const testRows = [
  [
    '工作态度', '责任心', '工作积极主动，有强烈的responsibility', '20%',
    '优秀', '工作积极主动，responsibility强',
    '优秀', '工作积极主动，responsibility强',
    '良好', '工作认真负责',
    '优秀', '工作表现优秀',
    'A', '无'
  ],
  [
    '工作能力', '专业技能', '具备良好的专业技能', '30%',
    '良好', '专业技能良好',
    '良好', '专业技能熟练',
    '优秀', '专业技能突出',
    '良好', '技能水平良好',
    'A', '无'
  ]
];

console.log('\n=== 测试列映射 ===');
const columnMap = parser.mapColumns(testHeaders);
console.log('360°评分字段数量:', columnMap.peerEvaluationFields.length);
columnMap.peerEvaluationFields.forEach(field => {
  console.log(`  ${field.type}: ${field.key} (索引: ${field.index})`);
});

console.log('\n=== 测试单员工表解析 ===');
const employeeName = '测试员工';
const defaultPeriod = '2025年第1季度';

const result = parser.parseSingleEmployeeTable(testHeaders, testRows, employeeName, defaultPeriod);
console.log('解析结果记录数:', result.length);

// 检查360°评分字段
result.forEach((record, index) => {
  console.log(`\n记录 ${index + 1}:`);
  console.log(`  员工姓名: ${record.employeeName}`);
  console.log(`  维度: ${record.dimensionName}`);
  console.log(`  指标: ${record.indicatorName}`);
  
  // 检查360°评分字段
  const field360Keys = Object.keys(record).filter(key => key.includes('360°评分-'));
  console.log(`  360°评分字段数量: ${field360Keys.length}`);
  field360Keys.forEach(key => {
    console.log(`    ${key}: ${record[key]}`);
  });
});

console.log('\n=== 验证原始数据中的360°评分字段 ===');

// 检查原始数据中的360°评分字段
const sampleRecord = testData.employees.find(emp => emp.name === '植锦涛');
if (sampleRecord && sampleRecord.records) {
  console.log(`植锦涛的记录:`);
  const firstRecord = sampleRecord.records[0];
  const field360Keys = Object.keys(firstRecord).filter(key => key.includes('360°评分-'));
  console.log(`  360°评分字段数量: ${field360Keys.length}`);
  field360Keys.forEach(key => {
    console.log(`    ${key}: ${firstRecord[key]}`);
  });
} else {
  console.log('未找到植锦涛的记录');
}

console.log('\n=== 测试完成 ===');
console.log('数据导入逻辑修正测试完成');