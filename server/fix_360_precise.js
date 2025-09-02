const fs = require('fs');
const path = require('path');

// 读取当前数据
const dataPath = path.join(__dirname, 'data', 'performance', 'performance_1756464678679.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== 精确360°评分修复分析 ===\n');

// 1. 重新分析数据结构
const employeeGroups = {};
let currentEmployee = null;
let currentHeaders = null;

// 按员工分组数据
rawData.data.forEach((record, index) => {
  const name = record.employeeName;
  
  // 检查是否是表头行
  if (name === '姓名' || name === '工号') {
    currentEmployee = null;
    currentHeaders = Object.keys(record);
    return;
  }
  
  // 如果是有效员工数据
  if (name && name !== '姓名' && name !== '工号') {
    if (!employeeGroups[name]) {
      employeeGroups[name] = {
        name: name,
        records: [],
        headers: [],
        peerEvaluators: [],
        scores: {}
      };
    }
    
    employeeGroups[name].records.push(record);
    
    // 分析该员工的360°评分字段
    Object.keys(record).forEach(key => {
      if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
        const evaluatorMatch = key.match(/360°评分-(.*?)(?:\(|（)/);
        if (evaluatorMatch) {
          const evaluator = evaluatorMatch[1].trim();
          const score = record[key];
          
          if (score && score !== '' && score !== '360°评分-') {
            if (!employeeGroups[name].scores[evaluator]) {
              employeeGroups[name].scores[evaluator] = [];
            }
            employeeGroups[name].scores[evaluator].push(score);
            
            if (!employeeGroups[name].peerEvaluators.includes(evaluator)) {
              employeeGroups[name].peerEvaluators.push(evaluator);
            }
          }
        }
      }
    });
  }
});

console.log('员工360°评价人分析：');
Object.entries(employeeGroups).forEach(([name, emp]) => {
  console.log(`- ${name}: ${emp.peerEvaluators.join(', ')}`);
  Object.entries(emp.scores).forEach(([evaluator, scoreList]) => {
    console.log(`  ${evaluator}: ${scoreList.join(', ')}`);
  });
});

// 2. 生成正确的数据结构
const fixedData = [];
const headers = rawData.metadata.headers;

// 重新处理每条记录
rawData.data.forEach(record => {
  const name = record.employeeName;
  
  // 跳过表头行
  if (name === '姓名' || name === '工号') {
    return;
  }
  
  // 处理有效员工记录
  if (name && employeeGroups[name]) {
    const newRecord = { ...record };
    const emp = employeeGroups[name];
    
    // 删除所有旧的360°评分字段
    Object.keys(newRecord).forEach(key => {
      if (key.startsWith('360°评分-')) {
        delete newRecord[key];
      }
    });
    
    // 重新添加正确的360°评分字段
    Object.entries(emp.scores).forEach(([evaluator, scoreList]) => {
      if (scoreList.length > 0) {
        const score = scoreList[0]; // 取第一个评分
        const scoreKey = `360°评分-${evaluator}`;
        const remarkKey = `360°评分-${evaluator}评分说明`;
        
        // 添加评分值
        newRecord[scoreKey] = score;
        
        // 查找对应的评分说明
        const originalRemarkKey = Object.keys(record).find(k => 
          k.includes(`360°评分-${evaluator}`) && k.includes('评分说明')
        );
        
        if (originalRemarkKey) {
          const remarkValue = record[originalRemarkKey];
          if (remarkValue && remarkValue !== '') {
            newRecord[remarkKey] = remarkValue;
          }
        }
      }
    });
    
    fixedData.push(newRecord);
  }
});

// 3. 保存修复后的数据
const fixedMetadata = {
  ...rawData.metadata,
  totalRecords: fixedData.length,
  headers: [...new Set(fixedData.flatMap(r => Object.keys(r)))],
  fixedAt: new Date().toISOString(),
  note: '修复360°评分字段，去除重复括号，确保每个员工的评价人正确'
};

const fixedOutput = {
  metadata: fixedMetadata,
  data: fixedData
};

const fixedPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_360.json');
fs.writeFileSync(fixedPath, JSON.stringify(fixedOutput, null, 2));

// 4. 验证修复结果
console.log('\n=== 修复验证 ===');
console.log(`原始记录: ${rawData.data.length}`);
console.log(`修复后记录: ${fixedData.length}`);
console.log(`有效员工: ${Object.keys(employeeGroups).length}`);

// 检查每个员工的360°评分字段
Object.keys(employeeGroups).slice(0, 3).forEach(name => {
  const emp = employeeGroups[name];
  const sample = fixedData.find(r => r.employeeName === name);
  if (sample) {
    console.log(`\n${name}的360°评分:`);
    Object.keys(sample).forEach(key => {
      if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
        const evaluator = key.replace('360°评分-', '');
        const score = sample[key];
        const remark = sample[`${key}评分说明`] || '无说明';
        console.log(`  ${evaluator}: ${score} - ${remark.substring(0, 50)}...`);
      }
    });
  }
});

console.log(`\n修复后的数据已保存到: ${fixedPath}`);

// 5. 创建验证脚本
const validatePath = path.join(__dirname, 'validate_fixed_360.js');
const validateScript = `
const fs = require('fs');
const path = require('path');

const fixedPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_360.json');
const data = JSON.parse(fs.readFileSync(fixedPath, 'utf8'));

console.log('=== 360°评分修复验证 ===');
console.log('总记录数:', data.data.length);

const employees = {};
data.data.forEach(record => {
  const name = record.employeeName;
  if (!employees[name]) {
    employees[name] = { name, peerEvaluators: [] };
  }
  
  Object.keys(record).forEach(key => {
    if (key.startsWith('360°评分-') && !key.includes('评分说明')) {
      const evaluator = key.replace('360°评分-', '');
      if (!employees[name].peerEvaluators.includes(evaluator)) {
        employees[name].peerEvaluators.push(evaluator);
      }
    }
  });
});

console.log('\\n员工评价人分布:');
Object.values(employees).forEach(emp => {
  console.log(\`- \${emp.name}: \${emp.peerEvaluators.join(', ')}\`);
});

console.log('\\n验证完成！');
`;

fs.writeFileSync(validatePath, validateScript.trim());
console.log(`验证脚本已创建: ${validatePath}`);