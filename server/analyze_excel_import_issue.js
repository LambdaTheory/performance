// 分析Excel导入流程中360°评价人解析问题
const fs = require('fs');
const path = require('path');

// 分析原始JSON文件
const originalFile = path.join(__dirname, 'data', 'performance', 'performance_1756699793319.json');
const fixedFile = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');

console.log('=== Excel导入360°评价人问题分析 ===\n');

// 1. 检查原始文件
if (fs.existsSync(originalFile)) {
  const originalData = JSON.parse(fs.readFileSync(originalFile, 'utf8'));
  
  console.log('📁 原始文件结构分析:');
  console.log(`   总记录数: ${originalData.data?.length || 0}`);
  
  // 查找所有360°评分相关字段
  const all360Fields = new Set();
  const reviewerNames = new Set();
  
  originalData.data?.forEach(record => {
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        all360Fields.add(key);
        
        // 提取评价人姓名
        const match = key.match(/360°评分-([^（]+)/);
        if (match) {
          reviewerNames.add(match[1].trim());
        }
      }
    });
  });
  
  console.log(`   360°评分字段总数: ${all360Fields.size}`);
  console.log(`   发现评价人: ${Array.from(reviewerNames).join(', ')}`);
  console.log(`   评价人数量: ${reviewerNames.size}`);
  
  // 显示前5个360°评分字段
  console.log('\n   前5个360°评分字段:');
  Array.from(all360Fields).slice(0, 5).forEach(field => {
    console.log(`   - ${field}`);
  });
}

// 2. 检查修复后的文件
if (fs.existsSync(fixedFile)) {
  const fixedData = JSON.parse(fs.readFileSync(fixedFile, 'utf8'));
  
  console.log('\n📁 修复后文件结构分析:');
  console.log(`   表头数量: ${fixedData.metadata?.tableHeaders?.length || 0}`);
  console.log(`   员工数量: ${fixedData.employees?.length || 0}`);
  
  // 分析每个表头的360°评价人
  fixedData.metadata?.tableHeaders?.forEach((header, index) => {
    const headerRecord = header.headerRecord || {};
    const reviewers = [];
    
    Object.keys(headerRecord).forEach(key => {
      if (key.includes('360°评分-') && key.includes('（0.0%）')) {
        const match = key.match(/360°评分-([^（]+)/);
        if (match) {
          reviewers.push(match[1].trim());
        }
      }
    });
    
    console.log(`\n   表头${index}:`);
    console.log(`     表头reviewers数组: [${header.reviewers?.join(', ') || '无'}]`);
    console.log(`     实际360°字段评价人: [${[...new Set(reviewers)].join(', ')}]`);
    console.log(`     评价人数量差异: ${[...new Set(reviewers)].length - (header.reviewers?.length || 0)}`);
  });
}

// 3. 对比分析
console.log('\n=== 问题总结 ===');
console.log('1. 原始文件仅包含2个固定评价人（刘志润、郑志宏）');
console.log('2. 修复后的文件显示每个表头可能有不同数量的评价人');
console.log('3. 表头中的reviewers数组与headerRecord中的实际字段不匹配');
console.log('4. 需要重新设计Excel导入逻辑以支持动态评价人解析');

// 4. 建议的修复方案
console.log('\n=== 建议的修复方案 ===');
console.log('1. 修改ExcelParserService类，动态解析所有360°评分字段');
console.log('2. 不再硬编码评价人列表，而是从表头字段实时提取');
console.log('3. 支持任意数量的360°评价人');
console.log('4. 确保reviewers数组与headerRecord字段保持一致');