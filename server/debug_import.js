const fs = require('fs');
const path = require('path');

// 调试导入数据的详细分析
const jsonFile = 'd:\\performance\\performance\\server\\data\\performance\\performance_1756464678679.json';

console.log('=== 360°评分数据调试分析 ===\n');

try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    console.log('1. 文件基本信息:');
    console.log(`   - 原始文件名: ${data.metadata.originalFilename}`);
    console.log(`   - 总记录数: ${data.metadata.totalRecords}`);
    console.log(`   - 检测到的期间: ${data.metadata.detectedPeriods.join(', ')}`);
    
    console.log('\n2. 表头字段分析:');
    data.metadata.headers.forEach((header, index) => {
        if (header.includes('360°评分')) {
            console.log(`   [${index}] ${header}`);
        }
    });
    
    console.log('\n3. 实际数据字段检查:');
    const sampleRecords = data.data.slice(0, 5); // 检查前5条记录
    
    sampleRecords.forEach((record, index) => {
        console.log(`\n   记录 ${index + 1} (${record.employeeName}):`);
        
        // 查找所有360°评分相关字段
        const peerFields = Object.keys(record).filter(key => key.includes('360°评分'));
        peerFields.forEach(field => {
            console.log(`     - ${field}: ${record[field]}`);
        });
        
        if (peerFields.length === 0) {
            console.log('     - 无360°评分字段');
        }
    });
    
    console.log('\n4. 全数据360°评分字段统计:');
    const allFields = new Set();
    data.data.forEach(record => {
        Object.keys(record).forEach(key => {
            if (key.includes('360°评分') && !key.includes('评分说明')) {
                allFields.add(key);
            }
        });
    });
    
    console.log(`   发现 ${allFields.size} 个独特的360°评分字段:`);
    Array.from(allFields).sort().forEach(field => {
        console.log(`   - ${field}`);
    });
    
    console.log('\n5. 数据质量问题检查:');
    
    // 检查表头行
    const headerRows = data.data.filter(record => 
        record.employeeName === '姓名' || 
        record.employeeId === '工号' ||
        record.department === '部门'
    );
    console.log(`   发现 ${headerRows.length} 条表头行被错误导入为数据`);
    
    // 检查字段名不匹配
    const expectedPeerFields = data.metadata.headers.filter(h => h.includes('360°评分'));
    const actualPeerFields = Array.from(allFields);
    
    console.log('\n6. 字段名不匹配分析:');
    console.log('   期望的字段名 (来自表头):');
    expectedPeerFields.forEach(field => console.log(`   - ${field}`));
    
    console.log('\n   实际的字段名 (来自数据):');
    actualPeerFields.forEach(field => console.log(`   - ${field}`));
    
    // 检查是否有额外的括号
    const hasExtraBracket = actualPeerFields.some(field => 
        field.match(/360°评分-.+（.*）（.*）/)
    );
    console.log(`\n   检测到额外括号格式: ${hasExtraBracket ? '是' : '否'}`);
    
    console.log('\n7. 有效员工记录筛选:');
    const validRecords = data.data.filter(record => 
        record.employeeName && 
        record.employeeName !== '姓名' &&
        record.employeeName !== '工号'
    );
    console.log(`   有效员工记录数: ${validRecords.length}`);
    
    // 分析每个有效员工的360°评价人
    const peerReviewersMap = new Map();
    validRecords.forEach(record => {
        const reviewers = [];
        Object.keys(record).forEach(key => {
            if (key.includes('360°评分') && !key.includes('评分说明')) {
                const match = key.match(/360°评分-(.+?)（/);
                if (match) {
                    reviewers.push(match[1]);
                }
            }
        });
        
        if (reviewers.length > 0) {
            peerReviewersMap.set(record.employeeName, reviewers);
        }
    });
    
    console.log('\n8. 员工360°评价人映射:');
    peerReviewersMap.forEach((reviewers, employee) => {
        console.log(`   ${employee}: ${reviewers.join(', ')}`);
    });
    
    console.log('\n=== 调试完成 ===');
    
} catch (error) {
    console.error('读取或解析文件时出错:', error.message);
}