const fs = require('fs');

// 读取修复后的数据
const data = JSON.parse(fs.readFileSync('data/performance/performance_fixed_real_360.json', 'utf8'));

const tableHeaders = data.metadata.tableHeaders;

console.log('=== 分析360°评价人完整信息 ===\n');

// 分析每个表头的360°评价人字段
let allReviewersFromHeaders = new Set();
let reviewerCountByHeader = {};

console.log('📊 每个表头的360°评价人详情：\n');

tableHeaders.forEach(header => {
    console.log(`表头${header.index}:`);
    
    // 从headerRecord中提取所有360°评价人字段
    const headerRecord = header.headerRecord;
    const reviewers = [];
    
    // 收集所有360°评分相关的字段
    Object.keys(headerRecord).forEach(key => {
        if (key.includes('360°评分-') && key.includes('（0.0%）')) {
            // 提取评价人姓名
            const match = key.match(/360°评分-([^（]+)（/);
            if (match && match[1]) {
                reviewers.push(match[1]);
                allReviewersFromHeaders.add(match[1]);
            }
        }
    });
    
    // 对比reviewers数组和实际字段中的评价人
    console.log(`  表头reviewers数组: [${header.reviewers.join(', ')}]`);
    console.log(`  实际360°字段评价人: [${reviewers.join(', ')}]`);
    console.log(`  评价人数量: ${reviewers.length}`);
    
    reviewerCountByHeader[header.index] = {
        fromReviewersArray: header.reviewers,
        fromHeaderFields: reviewers,
        count: reviewers.length
    };
    
    if (header.reviewers.length !== reviewers.length) {
        console.log(`  ⚠️  数量不匹配！`);
    }
    
    console.log('');
});

console.log('=== 统计汇总 ===');
console.log(`总表头数: ${tableHeaders.length}`);
console.log(`独立评价人总数: ${allReviewersFromHeaders.size}`);

// 找出有超过2个评价人的表头
console.log('\n=== 评价人数量超过2个的表头 ===');
Object.entries(reviewerCountByHeader).forEach(([index, data]) => {
    if (data.count > 2) {
        console.log(`表头${index}: ${data.count}个评价人 - [${data.fromHeaderFields.join(', ')}]`);
    }
});

console.log('\n=== 问题分析 ===');
console.log('1. 目前表头的reviewers数组只包含2个评价人');
console.log('2. 但实际headerRecord中的360°评分字段可能包含更多评价人');
console.log('3. 需要从headerRecord的所有360°评分字段中提取完整评价人列表');

// 保存完整分析
const analysis = {
    reviewerCountByHeader,
    allReviewers: Array.from(allReviewersFromHeaders).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    totalUniqueReviewers: allReviewersFromHeaders.size
};

fs.writeFileSync('360_reviewers_analysis.json', JSON.stringify(analysis, null, 2));
console.log('\n✅ 完整分析已保存到 360_reviewers_analysis.json');