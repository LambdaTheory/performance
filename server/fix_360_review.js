const fs = require('fs');
const path = require('path');

// 读取当前数据
const dataPath = path.join(__dirname, 'data', 'performance', 'performance_1756464678679.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== 360°评分数据修复分析 ===\n');

// 1. 分析每个员工的360°评分字段
const employees = {};
rawData.data.forEach(record => {
  const name = record.employeeName;
  if (name && name !== '姓名' && name !== '工号') {
    if (!employees[name]) {
      employees[name] = {
        name: name,
        records: [],
        peerEvaluators: [],
        actualScores: {}
      };
    }
    employees[name].records.push(record);
    
    // 收集该员工的所有360°评分字段
    Object.keys(record).forEach(key => {
      if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
        const evaluator = key.replace('360°评分-', '').replace(/\([^)]*\)/g, '').trim();
        const score = record[key];
        if (score && score !== '' && score !== '360°评分-') {
          if (!employees[name].actualScores[evaluator]) {
            employees[name].actualScores[evaluator] = [];
          }
          employees[name].actualScores[evaluator].push(score);
        }
        
        if (!employees[name].peerEvaluators.includes(evaluator)) {
          employees[name].peerEvaluators.push(evaluator);
        }
      }
    });
  }
});

console.log('员工列表及360°评价人分布：');
Object.values(employees).forEach(emp => {
  console.log(`- ${emp.name}: 评价人 ${emp.peerEvaluators.join(', ')}`);
  Object.entries(emp.actualScores).forEach(([evaluator, scores]) => {
    console.log(`  - ${evaluator}: ${scores.join(', ')}`);
  });
});

console.log('\n=== 修复后的数据结构 ===\n');

// 2. 生成修复后的数据
const fixedData = rawData.data.map(record => {
  const newRecord = { ...record };
  
  // 删除旧的360°评分字段（带重复括号的）
  Object.keys(newRecord).forEach(key => {
    if (key.startsWith('360°评分-') && key.includes('（0.0%）（0.0%）')) {
      delete newRecord[key];
    }
    if (key.startsWith('360°评分-') && key.includes('评分说明') && key.includes('（0.0%）（0.0%）')) {
      delete newRecord[key];
    }
  });
  
  // 重新提取正确的360°评分数据
  if (record.employeeName && record.employeeName !== '姓名' && record.employeeName !== '工号') {
    const employee = employees[record.employeeName];
    if (employee) {
      Object.entries(employee.actualScores).forEach(([evaluator, scores]) => {
        if (scores.length > 0) {
          const scoreKey = `360°评分-${evaluator}`;
          const remarkKey = `360°评分-${evaluator}评分说明`;
          
          // 添加评分值
          newRecord[scoreKey] = scores[0]; // 取第一个评分
          
          // 查找对应的评分说明
          const remarkKeyOriginal = `360°评分-${evaluator}评分说明`;
          const remarkValue = record[remarkKeyOriginal] || record[remarkKeyOriginal.replace('（0.0%）（0.0%）', '')];
          if (remarkValue && remarkValue !== '') {
            newRecord[remarkKey] = remarkValue;
          }
        }
      });
    }
  }
  
  return newRecord;
});

// 3. 统计修复结果
const validEmployees = Object.keys(employees).length;
const headerRows = rawData.data.filter(r => r.employeeName === '姓名' || r.employeeName === '工号').length;

console.log(`修复结果：
- 总记录数: ${rawData.data.length}
- 有效员工数: ${validEmployees}
- 表头行数: ${headerRows}
- 修复后记录数: ${fixedData.filter(r => r.employeeName && r.employeeName !== '姓名' && r.employeeName !== '工号').length}`);

// 4. 保存修复后的数据
const fixedDataPath = path.join(__dirname, 'data', 'performance', 'performance_fixed.json');
const fixedMetadata = {
  ...rawData.metadata,
  totalRecords: fixedData.filter(r => r.employeeName && r.employeeName !== '姓名' && r.employeeName !== '工号').length,
  fixedAt: new Date().toISOString()
};

const fixedOutput = {
  metadata: fixedMetadata,
  data: fixedData
};

fs.writeFileSync(fixedDataPath, JSON.stringify(fixedOutput, null, 2));
console.log(`修复后的数据已保存到: ${fixedDataPath}`);

// 5. 验证修复结果
console.log('\n=== 验证修复结果 ===\n');
const sampleEmployees = ['孙文秦', '刘志润', '曾若韵'].filter(name => employees[name]);
sampleEmployees.forEach(name => {
  const emp = employees[name];
  const sampleRecord = fixedData.find(r => r.employeeName === name);
  if (sampleRecord) {
    console.log(`${name}的360°评分字段:`);
    Object.keys(sampleRecord).forEach(key => {
      if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
        const evaluator = key.replace('360°评分-', '');
        const score = sampleRecord[key];
        const remark = sampleRecord[`${key}评分说明`] || '无说明';
        console.log(`  - ${evaluator}: ${score} (${remark})`);
      }
    });
  }
});

console.log('\n=== 修复完成 ===');