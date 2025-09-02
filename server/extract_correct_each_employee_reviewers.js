const fs = require('fs');

// 读取修复后的数据
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_real_360.json', 'utf8'));

const employees = data.employees;
const tableHeaders = data.metadata.tableHeaders;

console.log('=== 19名员工的360°评价人（按对应表头提取，绝不使用第一个表头）===\n');

// 创建表头映射：index -> reviewers数组
const headerMap = {};
tableHeaders.forEach(header => {
    headerMap[header.index] = header.reviewers;
});

// 按员工姓名排序
const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

let totalReviewers = 0;
let allReviewers = new Set();
let employeeReviewers = {};

// 遍历每个员工，使用其tableHeaderIndex获取对应表头的评价人
sortedEmployees.forEach(employee => {
    const tableHeaderIndex = employee.tableHeaderIndex;
    const reviewers = headerMap[tableHeaderIndex] || [];
    
    employeeReviewers[employee.name] = reviewers;
    
    console.log(`${employee.name}: ${reviewers.length > 0 ? reviewers.join(', ') : '无评价人'}`);
    
    reviewers.forEach(reviewer => {
        allReviewers.add(reviewer);
        totalReviewers++;
    });
});

console.log(`\n=== 统计信息 ===`);
console.log(`总员工数: ${employees.length}`);
console.log(`有评价人的员工数: ${Object.values(employeeReviewers).filter(r => r.length > 0).length}`);
console.log(`总评价人次数: ${totalReviewers}`);
console.log(`独立评价人数量: ${allReviewers.size}`);

// 验证表头完整性
console.log(`\n=== 验证表头完整性 ===`);
console.log(`表头总数: ${tableHeaders.length}`);
console.log(`缺失表头的员工:`);

let missingCount = 0;
sortedEmployees.forEach(employee => {
    const tableHeaderIndex = employee.tableHeaderIndex;
    if (!headerMap[tableHeaderIndex] || headerMap[tableHeaderIndex].length === 0) {
        console.log(`  ${employee.name}: 表头索引 ${tableHeaderIndex} 无对应评价人`);
        missingCount++;
    }
});

if (missingCount === 0) {
    console.log(`  ✅ 所有员工均有对应表头的评价人`);
}

// 详细列出每个表头的评价人
console.log(`\n=== 19个表头的详细评价人 ===`);
tableHeaders.forEach(header => {
    console.log(`表头${header.index}: ${header.reviewers.join(', ')}`);
});

// 保存结果到文件
const result = {
    employeeReviewers,
    summary: {
        totalEmployees: employees.length,
        totalReviewers,
        uniqueReviewers: Array.from(allReviewers).sort((a, b) => a.localeCompare(b, 'zh-CN')),
        uniqueReviewerCount: allReviewers.size
    }
};

fs.writeFileSync('correct_employee_reviewers.json', JSON.stringify(result, null, 2));
console.log(`\n✅ 结果已保存到 correct_employee_reviewers.json`);