// 简单测试360°评分字段解析
console.log('=== 测试360°评分字段解析修复 ===\n');

// 测试双重括号格式解析
function testDualBracketParsing() {
  const testCases = [
    '360°评分-刘志润（0.0%）（0.0%）',
    '360°评分-郑志宏（0.0%）（0.0%）',
    '360°评分-黎柏江（0.0%）（0.0%）',
    '360°评分-潘韵芝（0.0%）（0.0%）',
    '360°评分-张三评分说明',
    '360°评分-李四评分说明'
  ];

  console.log('📋 测试字段解析结果:');
  
  testCases.forEach(header => {
    if (header.includes('评分说明')) {
      // 评分说明字段
      const reviewerName = header.replace('360°评分-', '').replace('评分说明', '').trim();
      const cleanName = reviewerName.replace(/（[^）]*）/g, '').trim();
      console.log(`   评分说明: ${header} -> 评价人: ${cleanName}`);
    } else {
      // 评分结果字段
      const reviewerName = header.replace('360°评分-', '').replace(/（[^）]*）/g, '').trim();
      const weightMatch = header.match(/（([^）]*)）[^）]*$/);
      const weight = weightMatch ? weightMatch[1] : '0.0%';
      console.log(`   评分结果: ${header} -> 评价人: ${reviewerName}（${weight}）`);
    }
  });
}

// 测试数据过滤逻辑
function testDataFiltering() {
  const testData = [
    ['姓名', '工号', '部门', '所在考评表', '绩效等级'], // 表头行
    ['孙文秦', '1001', '我游科技', '季度绩效考核表', 'M-'], // 有效数据
    ['', '', '', '', ''], // 空行
    ['姓名', '工号', '部门', '所在考评表', '绩效等级'], // 另一个表头行
    ['刘志润', '1002', '设计部', '季度绩效考核表', 'M'] // 有效数据
  ];

  console.log('\n📋 测试数据过滤逻辑:');
  
  const filtered = testData.filter((row, index) => {
    const employeeName = row[0];
    const employeeId = row[1];
    return employeeName && employeeName !== '姓名' && 
           employeeId && employeeId !== '工号' &&
           employeeName.trim() !== '';
  });

  console.log(`   原始数据: ${testData.length} 行`);
  console.log(`   过滤后: ${filtered.length} 行`);
  
  filtered.forEach(row => {
    console.log(`   保留: ${row[0]} (${row[1]})`);
  });
}

// 运行测试
testDualBracketParsing();
testDataFiltering();

console.log('\n=== 测试完成 ===');