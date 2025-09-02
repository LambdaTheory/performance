// 正确提取完整的360°评价人信息
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'performance', 'performance_fixed_real_360.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const tableHeaders = data.metadata.tableHeaders;
const employees = data.employees;

console.log('=== 分析完整的360°评价人信息 ===\n');

// 1. 从每个表头的headerRecord中提取完整的360°评价人
const completeReviewersByHeader = {};

tableHeaders.forEach((header, index) => {
    const headerRecord = header.headerRecord || {};
    const reviewers = [];
    
    // 提取所有"360°评分-XXX"字段中的评价人姓名
    Object.keys(headerRecord).forEach(key => {
        if (key.startsWith('360°评分-') && key.includes('（0.0%）')) {
            const reviewerName = key.replace('360°评分-', '').split('（')[0];
            if (!reviewers.includes(reviewerName)) {
                reviewers.push(reviewerName);
            }
        }
    });
    
    completeReviewersByHeader[index] = {
        index: index,
        selfEvaluationResult: header.selfEvaluationResult,
        reviewersArray: header.reviewers || [], // 原来的reviewers数组
        completeReviewers: reviewers.sort(), // 从headerRecord提取的完整评价人
        reviewerCount: reviewers.length
    };
});

// 2. 为每个员工提取对应的完整360°评价人
const employeeCompleteReviewers = {};

employees.forEach(employee => {
    const tableHeaderIndex = employee.tableHeaderIndex;
    const employeeName = employee.name;
    
    if (tableHeaderIndex !== undefined && completeReviewersByHeader[tableHeaderIndex]) {
        employeeCompleteReviewers[employeeName] = {
            employeeName: employeeName,
            tableHeaderIndex: tableHeaderIndex,
            completeReviewers: completeReviewersByHeader[tableHeaderIndex].completeReviewers,
            reviewerCount: completeReviewersByHeader[tableHeaderIndex].reviewerCount
        };
    } else {
        employeeCompleteReviewers[employeeName] = {
            employeeName: employeeName,
            tableHeaderIndex: tableHeaderIndex,
            completeReviewers: [],
            reviewerCount: 0,
            note: '无对应表头或表头索引无效'
        };
    }
});

// 3. 统计和分析
console.log('=== 每个表头的完整360°评价人信息 ===');
Object.values(completeReviewersByHeader).forEach(header => {
    console.log(`表头 ${header.index}: ${header.selfEvaluationResult}`);
    console.log(`  原reviewers数组: [${header.reviewersArray.join(', ')}] (${header.reviewersArray.length}人)`);
    console.log(`  完整评价人: [${header.completeReviewers.join(', ')}] (${header.reviewerCount}人)`);
    console.log(`  差异: ${header.reviewerCount - header.reviewersArray.length}人\n`);
});

console.log('=== 每个员工的完整360°评价人 ===');
Object.values(employeeCompleteReviewers).forEach(emp => {
    console.log(`${emp.employeeName}: [${emp.completeReviewers.join(', ')}] (${emp.reviewerCount}人)`);
    if (emp.note) {
        console.log(`  备注: ${emp.note}`);
    }
});

// 4. 整体统计
const allReviewers = new Set();
const employeeReviewerCounts = [];

Object.values(employeeCompleteReviewers).forEach(emp => {
    emp.completeReviewers.forEach(reviewer => allReviewers.add(reviewer));
    employeeReviewerCounts.push(emp.reviewerCount);
});

console.log('\n=== 整体统计 ===');
console.log(`总员工数: ${employees.length}`);
console.log(`独立评价人总数: ${allReviewers.size}`);
console.log(`独立评价人列表: [${Array.from(allReviewers).sort().join(', ')}]`);
console.log(`评价人分布: ${employeeReviewerCounts.join(', ')}`);

// 5. 保存结果
const result = {
    completeReviewersByHeader,
    employeeCompleteReviewers,
    statistics: {
        totalEmployees: employees.length,
        totalUniqueReviewers: allReviewers.size,
        uniqueReviewersList: Array.from(allReviewers).sort(),
        reviewerDistribution: employeeReviewerCounts
    }
};

fs.writeFileSync(
    path.join(__dirname, 'complete_360_reviewers.json'),
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('\n✅ 完整的360°评价人信息已保存到 complete_360_reviewers.json');