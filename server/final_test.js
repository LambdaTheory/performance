// 最终测试：验证360°互评数据完整性和显示
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'performance', 'performance_1756455779537.json');

console.log('=== 360°互评数据完整性测试 ===');

try {
  const rawData = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(rawData);
  const records = jsonData.data || [];
  
  console.log('总记录数:', records.length);
  
  // 收集所有360°评价人
  const allReviewers = new Set();
  const allFields = new Set();
  
  records.forEach(record => {
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        const match = key.match(/360°评分-(.+?)（0\.0%）（0\.0%）/);
        if (match && match[1]) {
          allReviewers.add(match[1]);
          allFields.add(key);
        }
      }
    });
  });
  
  console.log('发现的所有评价人:', Array.from(allReviewers));
  console.log('发现的所有360°评分字段:', Array.from(allFields));
  
  // 验证每条记录的完整性
  const reviewerList = Array.from(allReviewers);
  let completeRecords = 0;
  
  records.forEach((record, index) => {
    const hasAllFields = reviewerList.every(reviewer => 
      record[`360°评分-${reviewer}（0.0%）（0.0%）`] !== undefined &&
      record[`360°评分-${reviewer}评分说明`] !== undefined
    );
    
    if (hasAllFields) {
      completeRecords++;
    } else {
      console.log(`记录 ${index + 1} 不完整:`, {
        员工: record.员工姓名,
        缺失字段: reviewerList.filter(reviewer => 
          !record[`360°评分-${reviewer}（0.0%）（0.0%）`] ||
          !record[`360°评分-${reviewer}评分说明`]
        )
      });
    }
  });
  
  console.log(`\n完整性统计:`);
  console.log(`总记录数: ${records.length}`);
  console.log(`完整记录数: ${completeRecords}`);
  console.log(`完整率: ${(completeRecords/records.length*100).toFixed(2)}%`);
  
  // 显示前3条记录作为示例
  console.log('\n前3条记录示例:');
  records.slice(0, 3).forEach((record, index) => {
    console.log(`\n记录 ${index + 1} - ${record.员工姓名}:`);
    reviewerList.forEach(reviewer => {
      const result = record[`360°评分-${reviewer}（0.0%）（0.0%）`];
      const remark = record[`360°评分-${reviewer}评分说明`];
      console.log(`  ${reviewer}: ${result || '空'} - ${remark || '空'}`);
    });
  });
  
} catch (error) {
  console.error('测试失败:', error);
}