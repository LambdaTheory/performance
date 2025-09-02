const fs = require('fs');
const path = require('path');

// 测试增强版Excel导入逻辑
const fs = require('fs');

// 读取import.js文件并获取ExcelParserService类
const importFilePath = 'd:\\performance\\performance\\server\\routes\\import.js';
const importContent = fs.readFileSync(importFilePath, 'utf8');

// 动态创建ExcelParserService类
let ExcelParserService;
eval(importContent + '\nExcelParserService = ExcelParserService;');

console.log('=== 测试增强版Excel导入逻辑 ===\n');

// 使用现有的JSON文件模拟测试
const jsonFile = 'd:\\performance\\performance\\server\\data\\performance\\performance_1756464678679.json';

// 模拟Excel数据格式
function createMockExcelData() {
  const data = [
    // 第一个子表的表头
    ['姓名', '工号', '部门', '所在考评表', '绩效等级', '绩效结果', '当前节点', '维度名称', '指标名称', '考核标准', '权重(%)', '360°评分-刘志润（0.0%）', '360°评分-刘志润评分说明', '360°评分-郑志宏（0.0%）', '360°评分-郑志宏评分说明'],
    // 第一个子表的数据
    ['孙文秦', '1001', '我游科技', '季度绩效考核表', 'M-', '0 M-', '考核结束', '工作业绩', '工作业绩', '考核标准内容...', '60', 'M', '积极跟进原画修改...', 'M', '专业能力强...'],
    ['孙文秦', '1001', '我游科技', '季度绩效考核表', 'M-', '0 M-', '考核结束', '专业度', '专业度', '考核标准内容...', '40', 'M', '对待各项目认真负责...', 'M', '认真负责好本职工作...'],
    
    // 第二个子表的表头（可能有不同评价人）
    ['姓名', '工号', '部门', '所在考评表', '绩效等级', '绩效结果', '当前节点', '维度名称', '指标名称', '考核标准', '权重(%)', '360°评分-黎柏江（0.0%）', '360°评分-黎柏江评分说明', '360°评分-潘韵芝（0.0%）', '360°评分-潘韵芝评分说明'],
    // 第二个子表的数据
    ['刘志润', '1002', '设计部', '季度绩效考核表', 'M', '0 M', '考核结束', '工作业绩', '工作业绩', '考核标准内容...', '60', 'M+', '沟通坦诚...', 'M', '符合预期...'],
    ['刘志润', '1002', '设计部', '季度绩效考核表', 'M', '0 M', '考核结束', '专业度', '专业度', '考核标准内容...', '40', 'M', '认真对待工作...', 'M', '沟通顺畅...'],
    
    // 第三个子表的表头
    ['姓名', '工号', '部门', '所在考评表', '绩效等级', '绩效结果', '当前节点', '维度名称', '指标名称', '考核标准', '权重(%)', '360°评分-张三（0.0%）', '360°评分-张三评分说明', '360°评分-李四（0.0%）', '360°评分-李四评分说明'],
    // 第三个子表的数据
    ['曾若韵', '1003', '设计部', '季度绩效考核表', 'M', '0 M', '考核结束', '工作业绩', '工作业绩', '考核标准内容...', '60', 'M', '评价内容...', 'M', '评价内容...']
  ];
  
  return data;
}

// 模拟测试
async function testEnhancedImport() {
  try {
    const parser = new ExcelParserService();
    const mockData = createMockExcelData();
    
    console.log('1. 模拟Excel数据结构:');
    console.log(`   - 总行数: ${mockData.length}`);
    console.log(`   - 表头行位置: ${mockData.findIndex(row => row.includes('所在考评表')) + 1}`);
    
    // 查找所有表头行
    const headerRows = [];
    for (let i = 0; i < mockData.length; i++) {
      const row = mockData[i];
      if (row && row.some(cell => String(cell).includes('所在考评表'))) {
        headerRows.push({
          index: i,
          headers: row
        });
      }
    }
    
    console.log(`   - 发现子表数量: ${headerRows.length}`);
    
    // 测试每个子表的解析
    for (let i = 0; i < headerRows.length; i++) {
      const headerInfo = headerRows[i];
      const headers = headerInfo.headers;
      
      let endIndex = mockData.length;
      if (i < headerRows.length - 1) {
        endIndex = headerRows[i + 1].index;
      }
      
      const rows = mockData.slice(headerInfo.index + 1, endIndex);
      
      console.log(`\n2. 子表 ${i + 1} 分析:`);
      console.log(`   - 表头: ${headers.join(', ')}`);
      console.log(`   - 数据行: ${rows.length}`);
      
      // 测试字段映射
      const columnMap = parser.mapColumns(headers);
      console.log(`   - 360°评价人: ${columnMap.peerEvaluationFields.length} 个`);
      columnMap.peerEvaluationFields.forEach(field => {
        console.log(`     * ${field.key}`);
      });
      
      // 测试数据解析
      const parsedData = parser.parsePerformanceData(headers, rows, '2025年第1季度');
      console.log(`   - 解析记录: ${parsedData.length} 条`);
      
      if (parsedData.length > 0) {
        const sample = parsedData[0];
        console.log(`   - 样本员工: ${sample.employeeName}`);
        
        // 检查360°评分字段
        const peerFields = Object.keys(sample).filter(key => key.includes('360°评分'));
        console.log(`   - 360°评分字段: ${peerFields.join(', ')}`);
      }
    }
    
    console.log('\n3. 双重括号格式测试:');
    const testHeaders = ['360°评分-测试用户（0.0%）（0.0%）', '360°评分-测试用户评分说明'];
    const testMap = parser.mapColumns(testHeaders);
    console.log(`   - 测试字段映射: ${JSON.stringify(testMap.peerEvaluationFields, null, 2)}`);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testEnhancedImport();