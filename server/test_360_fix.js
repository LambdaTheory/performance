const fs = require('fs');
const path = require('path');

// 加载测试数据
const testDataPath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

console.log('测试数据加载成功');
console.log('总员工数:', testData.metadata.totalEmployees);
console.log('总记录数:', testData.metadata.totalRecords);
console.log('表格数量:', testData.metadata.tableHeaders.length);

// 存储员工评价人信息
const employeeReviewers = new Map();

// 遍历所有表格头，为每个员工提取评价人信息
for (const tableHeader of testData.metadata.tableHeaders) {
    // 从selfEvaluationResult字段提取员工姓名
    const selfEvalMatch = tableHeader.headerRecord.selfEvaluationResult.match(/自评-([^（(]+)/);
    if (selfEvalMatch && selfEvalMatch[1]) {
        const employeeName = selfEvalMatch[1].trim();
        
        // 获取该员工的评价人列表
        const reviewers = tableHeader.reviewers || [];
        
        // 存储到Map中
        employeeReviewers.set(employeeName, reviewers);
        
        console.log(`${employeeName}:`);
        console.log(`  评价人数量: ${reviewers.length}`);
        console.log(`  评价人列表: ${reviewers.join(', ')}`);
    }
}

// 输出19名员工的完整评价人信息
console.log('\n=== 19名员工的完整360°评价人信息 ===');

const sortedEmployees = Array.from(employeeReviewers.keys()).sort();
for (const employeeName of sortedEmployees) {
    const reviewers = employeeReviewers.get(employeeName);
    console.log(`${employeeName}:`);
    console.log(`  评价人数量: ${reviewers.length}`);
    console.log(`  评价人列表: ${reviewers.join(', ')}`);
}

// 简单的总结
console.log(`\n总结: 共${employeeReviewers.size}名员工，均有对应的360°评价人信息`);