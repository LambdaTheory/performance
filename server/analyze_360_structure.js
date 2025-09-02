const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/performance/performance_1756464678679.json', 'utf8'));

console.log('=== 原始数据字段分析 ===');

// 获取所有可能的360°评分字段
const all360Fields = new Set();
data.data.forEach(record => {
  Object.keys(record).forEach(key => {
    if (key.includes('360')) {
      all360Fields.add(key);
    }
  });
});

console.log('所有360°相关字段:');
Array.from(all360Fields).sort().forEach(field => {
  console.log('  "' + field + '"');
});

// 检查是否有其他评价人
const reviewers = new Set();
all360Fields.forEach(field => {
  const match = field.match(/360°评分-([^（]+)/);
  if (match) {
    reviewers.add(match[1].trim());
  }
});

console.log('\n所有评价人:');
Array.from(reviewers).sort().forEach(reviewer => {
  console.log('  ' + reviewer);
});

// 检查表头行
const headerRecord = data.data.find(record => record.employeeName === '姓名');
if (headerRecord) {
  console.log('\n=== 表头行中的360°评分字段 ===');
  Object.keys(headerRecord).forEach(key => {
    if (key.includes('360')) {
      console.log(key + ': ' + headerRecord[key]);
    }
  });
}

// 检查几个具体员工的记录
console.log('\n=== 具体员工记录检查 ===');
const sampleEmployees = ['孙文秦', '刘志润', '曾若韵'];
sampleEmployees.forEach(name => {
  const records = data.data.filter(record => record.employeeName === name);
  if (records.length > 0) {
    console.log('\n' + name + ' 的360°评分字段:');
    const record = records[0];
    Object.keys(record).forEach(key => {
      if (key.includes('360°评分') && !key.includes('评分说明')) {
        console.log('  ' + key + ': ' + record[key]);
      }
    });
  }
});