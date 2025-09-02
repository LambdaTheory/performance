const fs = require('fs');

// 读取修复后的数据
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_real_360.json', 'utf8'));

const employees = data.employees;
const tableHeaders = data.metadata.tableHeaders;

console.log('=== 每个员工的360°评价人（按对应表头提取）===\n');

// 创建一个映射：tableHeaderIndex -> reviewers数组
const headerIndexToReviewers = {};
tableHeaders.forEach(header => {
    headerIndexToReviewers[header.index] = header.reviewers;
});

// 按员工姓名排序
const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

let totalReviewers = 0;
let allReviewers = new Set();

sortedEmployees.forEach(employee => {
    const tableHeaderIndex = employee.tableHeaderIndex;
    
    // 获取对应表头的评价人
    const reviewers = headerIndexToReviewers[tableHeaderIndex] || [];
    
    console.log(`${employee.name}: ${reviewers.join(', ')}`);
    
    reviewers.forEach(reviewer => {
        allReviewers.add(reviewer);
        totalReviewers++;
    });
});

console.log(`\n=== 统计信息 ===`);
console.log(`总员工数: ${employees.length}`);
console.log(`总评价人次数: ${totalReviewers}`);
console.log(`独立评价人: ${Array.from(allReviewers).sort((a, b) => a.localeCompare(b, 'zh-CN')).join(', ')}`);
console.log(`独立评价人数量: ${allReviewers.size}`);

// 验证每个员工是否有对应的表头
console.log(`\n=== 验证 ===`);
let missingHeaders = [];
sortedEmployees.forEach(employee => {
    const tableHeaderIndex = employee.tableHeaderIndex;
    if (!headerIndexToReviewers[tableHeaderIndex]) {
        missingHeaders.push(`${employee.name}(表头索引: ${tableHeaderIndex})`);
    }
});

if (missingHeaders.length > 0) {
    console.log(`❌ 缺失表头的员工: ${missingHeaders.join(', ')}`);
} else {
    console.log(`✅ 所有员工均有对应的表头`);
}

// 详细列出每个表头的评价人
console.log(`\n=== 每个表头的评价人详情 ===`);
tableHeaders.forEach(header => {
    console.log(`表头${header.index}: ${header.reviewers.join(', ')}`);
});