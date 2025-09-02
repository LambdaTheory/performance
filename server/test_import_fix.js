const fs = require('fs-extra');
const path = require('path');

// 测试修复后的import.js逻辑
async function testImportFix() {
  console.log('=== 测试修复后的Excel导入逻辑 ===\n');
  
  // 读取现有的JSON数据
  const jsonFile = path.join(__dirname, 'data', 'performance', 'performance_1756455779537.json');
  
  if (await fs.pathExists(jsonFile)) {
    const data = await fs.readJson(jsonFile);
    console.log(`现有数据记录数: ${data.data.length}`);
    
    // 检查360°评分字段
    const sampleRecord = data.data.find(record => record.employeeName !== '姓名' && record.employeeName !== '高宜平');
    if (sampleRecord) {
      console.log('\n样本记录检查:');
      console.log(`员工: ${sampleRecord.employeeName}`);
      console.log(`指标: ${sampleRecord.indicatorName}`);
      
      // 查找所有360°评分字段
      const peerFields = Object.keys(sampleRecord).filter(key => key.startsWith('360°评分-'));
      console.log('\n发现的360°评分字段:');
      peerFields.forEach(field => {
        console.log(`  ${field}: ${sampleRecord[field]}`);
      });
      
      // 提取评价人姓名
      const reviewers = new Set();
      peerFields.forEach(field => {
        if (!field.includes('评分说明')) {
          const match = field.match(/^360°评分-(.+?)（/);
          if (match) {
            reviewers.add(match[1]);
          }
        }
      });
      
      console.log(`\n发现的360°评价人: ${Array.from(reviewers).join(', ')}`);
      console.log(`评价人数量: ${reviewers.size}`);
    }
  } else {
    console.log('JSON文件不存在');
  }
}

testImportFix().catch(console.error);