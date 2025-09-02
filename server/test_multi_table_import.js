const fs = require('fs-extra');
const path = require('path');

// 模拟测试多表合并的Excel解析
class TestMultiTableImport {
  constructor() {
    this.testData = [
      // 第一行 - 表头信息（无效数据）
      ['员工季度绩效考核表', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 第二行 - 空行
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 第三行 - 员工基本信息
      ['姓名：张三', '部门：技术部', '职位：前端工程师', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 第四行 - 空行
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      // 第五行 - 真正的表头（包含"所在考评表"）
      ['所在考评表', '姓名', '部门', '职位', '维度名称', '指标名称', '权重', '考核标准', '自评结果', '自评说明', '360°评分-李四（80%）', '360°评分-李四评分说明', '360°评分-王五（90%）', '360°评分-王五评分说明', '360°评分-赵六（85%）', '360°评分-赵六评分说明', '上级评分结果', '上级评分说明', '最终评分', '备注'],
      // 第六行开始 - 实际数据
      ['季度绩效考核表', '张三', '技术部', '前端工程师', '工作业绩', '项目交付质量', 0.4, '按时高质量完成项目任务', 90, '能够按时完成项目', 85, '项目完成度较高', 95, '项目质量很好', 88, '表现稳定', 90, '整体表现优秀', 90, ''],
      ['季度绩效考核表', '张三', '技术部', '前端工程师', '团队协作', '跨部门沟通', 0.3, '与其他部门有效协作', 80, '沟通基本顺畅', 75, '沟通技巧需要提升', 88, '协作积极', 85, '配合良好', 85, '团队协作良好', 82, ''],
      ['季度绩效考核表', '李四', '产品部', '产品经理', '产品规划', '需求分析', 0.5, '准确分析用户需求', 85, '分析基本准确', 90, '分析深入', 80, '需要改进', 92, '分析全面', 88, '分析能力较强', 87, '']
    ];
  }

  // 模拟查找表头行
  findHeaderRow(jsonData) {
    let headerRowIndex = 0;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && row.some(cell => String(cell).includes('所在考评表'))) {
        headerRowIndex = i;
        console.log(`找到表头行在索引: ${headerRowIndex}`);
        console.log(`表头内容: ${row.join(', ')}`);
        break;
      }
    }
    return headerRowIndex;
  }

  // 模拟提取360°评价人
  extractPeerReviewers(headers) {
    const peerReviewers = [];
    console.log('表头数组:', headers);
    
    headers.forEach((header, index) => {
      const headerStr = String(header || '').trim();
      console.log(`检查表头[${index}]: "${headerStr}"`);
      
      if (headerStr.startsWith('360°评分-') && !headerStr.includes('评分说明')) {
        console.log(`匹配到360°评分字段: ${headerStr}`);
        // 修复正则表达式，正确处理中文括号
        const match = headerStr.match(/^360°评分-(.+?)（(.+?)）$/);
        if (match) {
          const reviewerName = match[1].trim();
          const weight = match[2];
          peerReviewers.push({
            name: reviewerName,
            weight: weight,
            fieldName: headerStr
          });
          console.log(`提取到评价人: ${reviewerName}, 权重: ${weight}`);
        } else {
          console.log(`未匹配到评价人信息: ${headerStr}`);
        }
      }
    });
    return peerReviewers;
  }

  runTest() {
    console.log('=== 测试多表合并Excel导入 ===\n');
    
    const jsonData = this.testData;
    console.log(`总行数: ${jsonData.length}`);
    
    // 查找表头行
    const headerRowIndex = this.findHeaderRow(jsonData);
    const headers = jsonData[headerRowIndex];
    const rows = jsonData.slice(headerRowIndex + 1);
    
    console.log(`\n数据行数: ${rows.length}`);
    
    // 提取360°评价人
    const peerReviewers = this.extractPeerReviewers(headers);
    console.log(`\n发现的360°评价人:`);
    peerReviewers.forEach((reviewer, index) => {
      console.log(`${index + 1}. ${reviewer.name} (权重: ${reviewer.weight})`);
    });
    
    console.log(`\n总共发现 ${peerReviewers.length} 个360°评价人`);
    
    // 验证数据完整性
    console.log(`\n数据示例:`);
    rows.slice(0, 2).forEach((row, index) => {
      console.log(`第${index + 1}行数据:`);
      console.log(`  员工: ${row[1]}`);
      console.log(`  部门: ${row[2]}`);
      console.log(`  指标: ${row[5]}`);
      console.log(`  360°评分-李四: ${row[10]} (${row[11]})`);
      console.log(`  360°评分-王五: ${row[12]} (${row[13]})`);
      console.log(`  360°评分-赵六: ${row[14]} (${row[15]})`);
    });
  }
}

// 运行测试
const test = new TestMultiTableImport();
test.runTest();