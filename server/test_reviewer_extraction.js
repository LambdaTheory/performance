const fs = require('fs');
const path = require('path');

// 加载测试数据
const testDataPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

console.log('测试数据加载成功');
console.log('总员工数:', testData.metadata.totalEmployees);
console.log('总记录数:', testData.metadata.totalRecords);
console.log('表格数量:', testData.metadata.tableHeaders.length);

// 模拟ExcelParserService类的相关方法
class MockExcelParserService {
  constructor() {
    this.columnMap = {
      peerEvaluationFields: []
    };
  }

  // 模拟mapColumns方法
  mapColumns(headerRecord) {
    this.columnMap.peerEvaluationFields = [];
    
    // 遍历headerRecord的所有字段
    for (const [fieldName, headerValue] of Object.entries(headerRecord)) {
      // 确保headerValue是字符串类型
      const headerStr = String(headerValue || '');
      
      // 检查是否是360°评分字段 - 修正逻辑
      // 只处理字段名以'360°评分-'开头且不是评分说明的字段
      if (fieldName.startsWith('360°评分-') && !fieldName.includes('评分说明')) {
        console.log(`\n发现360°评分字段:`);
        console.log(`  字段名: ${fieldName}`);
        console.log(`  表头值: ${headerStr}`);
        
        // 修正后的评价人提取逻辑
        let reviewerName = null;
        
        // 首先尝试从表头值提取评价人姓名
        const headerMatch = headerStr.match(/^360°评分-([^（(]+)/);
        if (headerMatch && headerMatch[1]) {
          reviewerName = headerMatch[1].trim();
          console.log(`  从表头值提取评价人: ${reviewerName}`);
        } else {
          // 如果从表头值提取失败，尝试从字段名提取
          const fieldMatch = fieldName.match(/^360°评分-([^（(]+)/);
          if (fieldMatch && fieldMatch[1]) {
            reviewerName = fieldMatch[1].trim();
            console.log(`  从字段名提取评价人: ${reviewerName}`);
          }
        }
        
        if (reviewerName) {
          // 构建评分结果和说明的字段名
          const resultField = `peerEvaluationResult_${reviewerName}`;
          const remarkField = `peerEvaluationRemark_${reviewerName}`;
          
          // 查找对应的评分说明字段
          let remarkFieldName = null;
          for (const [remarkFieldKey, remarkFieldValue] of Object.entries(headerRecord)) {
            const remarkFieldStr = String(remarkFieldValue || '');
            // 检查是否是对应的评分说明字段
            if (remarkFieldStr.includes('360°评分-') && remarkFieldStr.includes('评分说明') && 
                remarkFieldStr.includes(reviewerName)) {
              remarkFieldName = remarkFieldKey;
              break;
            }
          }
          
          this.columnMap.peerEvaluationFields.push({
            resultField: resultField,
            remarkField: remarkField,
            originalField: fieldName,
            originalRemarkField: remarkFieldName || fieldName.replace('360°评分-', '360°评分-').replace('（0.0%）', '') + '评分说明',
            reviewerName: reviewerName
          });
          
          console.log(`  添加到字段映射:`);
          console.log(`    评分字段: ${resultField}`);
          console.log(`    说明字段: ${remarkField}`);
          if (remarkFieldName) {
            console.log(`    对应说明字段名: ${remarkFieldName}`);
          }
        } else {
          console.log(`  警告: 无法提取评价人姓名`);
        }
      }
    }
  }

  // 模拟处理单条记录的方法
  processRecord(record, headerRecord) {
    const processedRecord = { ...record };
    
    // 遍历所有360°评分字段
    for (const field of this.columnMap.peerEvaluationFields) {
      const resultValue = record[field.originalField];
      const remarkValue = record[field.originalRemarkField];
      
      if (resultValue !== undefined) {
        processedRecord[field.resultField] = resultValue;
        console.log(`  设置 ${field.resultField} = ${resultValue}`);
      }
      
      if (remarkValue !== undefined) {
        processedRecord[field.remarkField] = remarkValue;
        console.log(`  设置 ${field.remarkField} = ${remarkValue}`);
      }
    }
    
    return processedRecord;
  }
}

// 创建测试实例
const parser = new MockExcelParserService();

// 测试第一个表格
const firstTable = testData.metadata.tableHeaders[0];
console.log(`\n=== 测试表格 ${firstTable.index} ===`);
console.log('预设评价人:', firstTable.reviewers);

// 调用mapColumns方法
parser.mapColumns(firstTable.headerRecord);

// 显示提取结果
console.log('\n=== 提取结果 ===');
console.log('提取到的评价人数量:', parser.columnMap.peerEvaluationFields.length);
parser.columnMap.peerEvaluationFields.forEach((field, index) => {
  console.log(`${index + 1}. 评价人: ${field.reviewerName}`);
  console.log(`   评分字段: ${field.resultField}`);
  console.log(`   说明字段: ${field.remarkField}`);
});

// 验证是否正确提取了所有评价人
const extractedReviewers = parser.columnMap.peerEvaluationFields.map(f => f.reviewerName);
const expectedReviewers = firstTable.reviewers;

console.log('\n=== 验证结果 ===');
console.log('预期评价人:', expectedReviewers);
console.log('提取评价人:', extractedReviewers);

const isCorrect = expectedReviewers.every(reviewer => extractedReviewers.includes(reviewer)) && 
                 extractedReviewers.every(reviewer => expectedReviewers.includes(reviewer));

console.log(`\n测试结果: ${isCorrect ? '✅ 成功' : '❌ 失败'}`);

if (!isCorrect) {
  console.log('缺失的评价人:', expectedReviewers.filter(r => !extractedReviewers.includes(r)));
  console.log('多余的评价人:', extractedReviewers.filter(r => !expectedReviewers.includes(r)));
}

// 测试多个表格
console.log('\n=== 测试所有表格 ===');
let allTestsPassed = true;

for (let i = 0; i < Math.min(5, testData.metadata.tableHeaders.length); i++) {
  const table = testData.metadata.tableHeaders[i];
  const tableParser = new MockExcelParserService();
  
  console.log(`\n表格 ${table.index}:`);
  console.log('  预期评价人:', table.reviewers);
  
  tableParser.mapColumns(table.headerRecord);
  const tableExtractedReviewers = tableParser.columnMap.peerEvaluationFields.map(f => f.reviewerName);
  console.log('  提取评价人:', tableExtractedReviewers);
  
  const tableIsCorrect = table.reviewers.every(reviewer => tableExtractedReviewers.includes(reviewer)) && 
                       tableExtractedReviewers.every(reviewer => table.reviewers.includes(reviewer));
  
  console.log(`  结果: ${tableIsCorrect ? '✅ 成功' : '❌ 失败'}`);
  
  if (!tableIsCorrect) {
    allTestsPassed = false;
    console.log('  缺失的评价人:', table.reviewers.filter(r => !tableExtractedReviewers.includes(r)));
    console.log('  多余的评价人:', tableExtractedReviewers.filter(r => !table.reviewers.includes(r)));
  }
}

console.log(`\n=== 总体测试结果 ===`);
console.log(`所有测试: ${allTestsPassed ? '✅ 全部通过' : '❌ 存在失败'}`);