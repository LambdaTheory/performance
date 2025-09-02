// 修复后的Excel导入逻辑 - 支持动态360°评价人解析
const fs = require('fs');
const path = require('path');

class FixedExcelParserService {
  
  /**
   * 修正后的表头映射方法 - 支持动态360°评价人解析
   */
  mapColumns(headers) {
    const map = {
      name: -1,
      employeeId: -1,
      department: -1,
      position: -1,
      evaluationForm: -1,
      period: -1,
      level: -1,
      currentNode: -1,
      dimensionName: -1,
      indicatorName: -1,
      evaluationStandard: -1,
      weight: -1,
      selfEvaluationResult: -1,
      selfEvaluationRemark: -1,
      supervisorEvaluationResult: -1,
      supervisorEvaluationRemark: -1,
      evaluator: -1,
      date: -1,
      comments: -1,
      peerEvaluationFields: [] // 动态360°评价人字段
    };

    const allReviewers = new Set(); // 收集所有评价人

    headers.forEach((header, index) => {
      const headerStr = String(header || '').trim();
      const lowerHeader = headerStr.toLowerCase();

      // 基本信息映射
      if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
        map.name = index;
      } else if (lowerHeader.includes('工号') || lowerHeader.includes('id')) {
        map.employeeId = index;
      } else if (lowerHeader.includes('部门')) {
        map.department = index;
      } else if (lowerHeader.includes('职位') || lowerHeader.includes('岗位')) {
        map.position = index;
      } else if (lowerHeader.includes('所在考评表') || lowerHeader.includes('考评表')) {
        map.evaluationForm = index;
      } else if (lowerHeader.includes('周期') || lowerHeader.includes('期间')) {
        map.period = index;
      } else if (lowerHeader.includes('绩效等级') || lowerHeader.includes('等级')) {
        map.level = index;
      } else if (lowerHeader.includes('当前节点')) {
        map.currentNode = index;
      } else if (lowerHeader === '维度名称') {
        map.dimensionName = index;
      } else if (lowerHeader === '指标名称') {
        map.indicatorName = index;
      } else if (lowerHeader.includes('考核标准')) {
        map.evaluationStandard = index;
      } else if (lowerHeader.includes('权重')) {
        map.weight = index;
      } else if (lowerHeader.includes('自评-') && !lowerHeader.includes('说明')) {
        map.selfEvaluationResult = index;
      } else if (lowerHeader.includes('自评') && lowerHeader.includes('说明')) {
        map.selfEvaluationRemark = index;
      } else if (lowerHeader.includes('上级评分-') && lowerHeader.includes('100.0%')) {
        map.supervisorEvaluationResult = index;
      } else if (lowerHeader.includes('上级评分') && lowerHeader.includes('说明')) {
        map.supervisorEvaluationRemark = index;
      } else if (lowerHeader.includes('评价人') || lowerHeader.includes('考核人')) {
        map.evaluator = index;
      } else if (lowerHeader.includes('日期') || lowerHeader.includes('时间')) {
        map.date = index;
      } else if (lowerHeader.includes('备注') || lowerHeader.includes('评语')) {
        map.comments = index;
      }
      
      // 关键：动态收集360°评分字段
      else if (headerStr.startsWith('360°评分-') && !headerStr.includes('评分说明')) {
        // 提取评价人姓名
        let reviewerName = null;
        
        // 支持多种格式：360°评分-姓名（权重）或360°评分-姓名（权重）（权重）
        const match = headerStr.match(/^360°评分-([^（(]+)/);
        if (match && match[1]) {
          reviewerName = match[1].trim();
          allReviewers.add(reviewerName);
        }

        if (reviewerName) {
          map.peerEvaluationFields.push({
            type: 'result',
            reviewerName: reviewerName,
            index: index,
            originalHeader: headerStr
          });
        }
      }
      
      // 收集360°评分说明字段
      else if (headerStr.startsWith('360°评分-') && headerStr.includes('评分说明')) {
        // 尝试匹配对应的评价人
        let reviewerName = null;
        const match = headerStr.match(/^360°评分-([^（(]+)/);
        if (match && match[1]) {
          reviewerName = match[1].trim();
        }

        if (reviewerName) {
          map.peerEvaluationFields.push({
            type: 'remark',
            reviewerName: reviewerName,
            index: index,
            originalHeader: headerStr
          });
        }
      }
    });

    // 配对结果和说明字段
    const pairedFields = [];
    const resultFields = map.peerEvaluationFields.filter(f => f.type === 'result');
    const remarkFields = map.peerEvaluationFields.filter(f => f.type === 'remark');

    resultFields.forEach(resultField => {
      const matchingRemark = remarkFields.find(remarkField => 
        remarkField.reviewerName === resultField.reviewerName
      );
      
      pairedFields.push({
        reviewerName: resultField.reviewerName,
        resultIndex: resultField.index,
        remarkIndex: matchingRemark ? matchingRemark.index : -1,
        resultHeader: resultField.originalHeader,
        remarkHeader: matchingRemark ? matchingRemark.originalHeader : ''
      });
    });

    map.peerEvaluationFields = pairedFields;
    map.allReviewers = Array.from(allReviewers).sort(); // 返回所有发现的评价人

    return map;
  }

  /**
   * 修正后的数据解析方法
   */
  parseRows(rows, columnMap, period) {
    const data = [];
    
    if (!rows || rows.length === 0) return data;

    // 按员工分组
    const employeeGroups = {};
    rows.forEach((row, index) => {
      const employeeName = this.getCellValue(row, columnMap.name);
      if (employeeName && employeeName !== '姓名') {
        if (!employeeGroups[employeeName]) {
          employeeGroups[employeeName] = [];
        }
        employeeGroups[employeeName].push({ row, index });
      }
    });

    // 处理每个员工的记录
    Object.keys(employeeGroups).forEach(employeeName => {
      const employeeRows = employeeGroups[employeeName];
      const firstRow = employeeRows[0].row;

      // 提取员工基本信息
      const employeeInfo = {
        name: this.getCellValue(firstRow, columnMap.name),
        id: this.getCellValue(firstRow, columnMap.employeeId),
        department: this.getCellValue(firstRow, columnMap.department),
        position: this.getCellValue(firstRow, columnMap.position),
        evaluationForm: this.getCellValue(firstRow, columnMap.evaluationForm),
        evaluationPeriod: this.getCellValue(firstRow, columnMap.period) || period,
        currentNode: this.getCellValue(firstRow, columnMap.currentNode),
        level: this.getCellValue(firstRow, columnMap.level),
        evaluator: this.getCellValue(firstRow, columnMap.evaluator),
        evaluationDate: this.getCellValue(firstRow, columnMap.date)
      };

      // 处理每个指标行
      employeeRows.forEach(({ row }) => {
        const dimensionName = this.getCellValue(row, columnMap.dimensionName);
        const indicatorName = this.getCellValue(row, columnMap.indicatorName);

        if (indicatorName && !indicatorName.includes('总分') && !indicatorName.includes('总评')) {
          const record = {
            ...employeeInfo,
            dimensionName,
            indicatorName,
            assessmentStandard: this.getCellValue(row, columnMap.evaluationStandard),
            weight: this.parseWeight(this.getCellValue(row, columnMap.weight)),
            selfEvaluationResult: this.getCellValue(row, columnMap.selfEvaluationResult),
            selfEvaluationRemark: this.getCellValue(row, columnMap.selfEvaluationRemark),
            supervisorEvaluationResult: this.getCellValue(row, columnMap.supervisorEvaluationResult),
            supervisorEvaluationRemark: this.getCellValue(row, columnMap.supervisorEvaluationRemark),
            performanceResult: this.getCellValue(row, columnMap.performanceResult),
            comments: this.getCellValue(row, columnMap.comments)
          };

          // 动态添加360°评分字段
          columnMap.peerEvaluationFields.forEach(peerField => {
            const score = this.getCellValue(row, peerField.resultIndex);
            const remark = this.getCellValue(row, peerField.remarkIndex);
            
            if (score) {
              record[`360°评分-${peerField.reviewerName}`] = score;
            }
            if (remark) {
              record[`360°评分-${peerField.reviewerName}评分说明`] = remark;
            }
          });

          data.push(record);
        }
      });
    });

    return data;
  }

  getCellValue(row, index) {
    if (index === undefined || index < 0 || index >= row.length) return '';
    const value = row[index];
    return value !== undefined && value !== null ? String(value).trim() : '';
  }

  parseWeight(weightStr) {
    if (!weightStr) return null;
    const str = String(weightStr).trim();
    
    if (str.includes('%')) {
      const num = parseFloat(str.replace('%', ''));
      return isNaN(num) ? null : num / 100;
    }
    
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    return num > 1 ? num / 100 : num;
  }
}

// 测试修复后的逻辑
function testFixedLogic() {
  console.log('=== 测试修复后的Excel导入逻辑 ===\n');
  
  // 模拟表头（包含多个评价人）
  const mockHeaders = [
    '姓名', '部门', '职位', '维度名称', '指标名称', '考核标准', '权重',
    '自评-张三（0.0%）', '自评-张三评分说明',
    '360°评分-李四（80%）', '360°评分-李四评分说明',
    '360°评分-王五（90%）', '360°评分-王五评分说明',
    '360°评分-赵六（75%）', '360°评分-赵六评分说明',
    '上级评分-主管（100%）', '上级评分-主管评分说明',
    '绩效结果', '备注'
  ];

  const parser = new FixedExcelParserService();
  const columnMap = parser.mapColumns(mockHeaders);

  console.log('📊 修复后发现的评价人:');
  console.log(`   评价人数量: ${columnMap.allReviewers?.length || 0}`);
  console.log(`   评价人列表: ${columnMap.allReviewers?.join(', ') || '无'}`);
  
  console.log('\n📋 360°评分字段映射:');
  columnMap.peerEvaluationFields.forEach(field => {
    console.log(`   ${field.reviewerName}: 结果[${field.resultIndex}] 说明[${field.remarkIndex}]`);
  });

  return {
    reviewerCount: columnMap.allReviewers?.length || 0,
    reviewers: columnMap.allReviewers || [],
    fields: columnMap.peerEvaluationFields
  };
}

// 运行测试
const testResult = testFixedLogic();

// 保存修复方案
const fixReport = {
  timestamp: new Date().toISOString(),
  originalIssue: 'Excel导入仅支持2个固定评价人',
  rootCause: '表头解析逻辑硬编码了评价人数量',
  fixDescription: '动态解析所有360°评分字段，支持任意数量评价人',
  testResult: testResult,
  nextSteps: [
    '替换ExcelParserService类',
    '更新import.js路由',
    '重新导入原始Excel文件',
    '验证360°评价人数量正确性'
  ]
};

fs.writeFileSync('excel_import_fix_report.json', JSON.stringify(fixReport, null, 2));
console.log('\n✅ 修复方案已保存到 excel_import_fix_report.json');