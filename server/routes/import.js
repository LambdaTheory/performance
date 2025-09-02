/**
 * Excel导入相关API路由
 */

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/middleware');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式(.xlsx, .xls)'));
    }
  }
});

// 数据存储服务
class DataStorageService {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.initialized = false;
  }

  async initDirectories() {
    if (this.initialized) return;
    
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'performance'),
      path.join(this.dataDir, 'imports'),
      path.join(this.dataDir, 'backups')
    ];
    
    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }
    
    this.initialized = true;
    logger.info('数据目录初始化完成');
  }

  async savePerformanceData(data, metadata) {
    // 确保目录已初始化
    await this.initDirectories();
    
    const timestamp = Date.now();
    const filename = `performance_${timestamp}.json`;
    const filepath = path.join(this.dataDir, 'performance', filename);
    
    const saveData = {
      metadata,
      data,
      importTime: new Date().toISOString(),
      id: timestamp
    };
    
    await fs.writeJson(filepath, saveData, { spaces: 2 });
    
    // 保存导入记录
    await this.saveImportRecord({
      id: timestamp,
      filename: metadata.originalFilename,
      filepath,
      recordCount: data.length,
      periods: metadata.detectedPeriods,
      status: 'success',
      importTime: new Date().toISOString()
    });
    
    return { id: timestamp, filepath };
  }

  async saveImportRecord(record) {
    // 确保目录已初始化
    await this.initDirectories();
    
    const recordsFile = path.join(this.dataDir, 'imports', 'history.json');
    let records = [];
    
    if (await fs.pathExists(recordsFile)) {
      records = await fs.readJson(recordsFile);
    }
    
    records.unshift(record);
    
    // 只保留最近100条记录
    if (records.length > 100) {
      records = records.slice(0, 100);
    }
    
    await fs.writeJson(recordsFile, records, { spaces: 2 });
  }

  async getImportHistory() {
    // 确保目录已初始化
    await this.initDirectories();
    
    const recordsFile = path.join(this.dataDir, 'imports', 'history.json');
    if (await fs.pathExists(recordsFile)) {
      return await fs.readJson(recordsFile);
    }
    return [];
  }
}

// Excel解析服务
class ExcelParserService {
  parseExcelFile(filePath, originalFilename) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为JSON数据
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Excel文件数据不足，至少需要包含表头和一行数据');
      }
      
      // 查找所有表头行（包含"所在考评表"的行）
      const headerRows = [];
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row.some(cell => String(cell).includes('所在考评表'))) {
          headerRows.push({
            index: i,
            headers: row
          });
        }
      }
      
      if (headerRows.length === 0) {
        throw new Error('未找到包含"所在考评表"的表头行');
      }
      
      console.log(`发现 ${headerRows.length} 个子表，开始逐个处理...`);
      
      const allData = [];
      const detectedPeriods = new Set();
      const allHeaders = [];
      
      // 从文件名提取考核周期
      const periodFromFilename = this.extractPeriodFromFilename(originalFilename);
      
      // 处理每个子表
      for (let i = 0; i < headerRows.length; i++) {
        const headerInfo = headerRows[i];
        const headers = headerInfo.headers;
        
        // 确定数据行的结束位置（下一个表头行或文件末尾）
        let endIndex = jsonData.length;
        if (i < headerRows.length - 1) {
          endIndex = headerRows[i + 1].index;
        }
        
        const rows = jsonData.slice(headerInfo.index + 1, endIndex);
        
        console.log(`处理子表 ${i + 1}: 表头行 ${headerInfo.index + 1}, 数据行 ${rows.length} 条`);
        
        // 分割为每个员工小表
        const employeeTables = this.splitIntoEmployeeTables(headers, rows);
        
        // 处理每个员工小表
        employeeTables.forEach(table => {
          const employeeData = this.parseSingleEmployeeTable(table.headers, table.rows, table.employeeName, periodFromFilename);
          allData.push(...employeeData);
        });
        
        allHeaders.push(...headers);
      }
      
      // 过滤掉表头行数据（员工姓名为"姓名"或空值的记录）
      const validData = allData.filter(record => 
        record.employeeName && 
        record.employeeName !== '姓名' && 
        record.employeeName !== '工号' &&
        record.employeeName.trim() !== ''
      );
      
      console.log(`原始数据 ${allData.length} 条，有效数据 ${validData.length} 条`);
      
      return {
        success: true,
        data: validData,
        detectedPeriods: Array.from(detectedPeriods),
        totalRecords: validData.length,
        headers: [...new Set(allHeaders)] // 去重后的表头
      };
    } catch (error) {
      logger.error('Excel解析失败:', error);
      throw new Error(`Excel文件解析失败: ${error.message}`);
    }
  }

  // 新增：从文件名提取考核周期的方法
  extractPeriodFromFilename(filename) {
    // 匹配年份和季度/月份等时间信息
    const patterns = [
      /([0-9]{4})年.*?第([0-9]+)季度/,  // 2025年第2季度
      /([0-9]{4})年([0-9]+)月/,        // 2025年3月
      /([0-9]{4})-([0-9]+)/,          // 2025-Q2
      /([0-9]{4}).*?([上下])半年/,      // 2025年上半年
    ];
    
    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        if (pattern.source.includes('季度')) {
          return `${match[1]}年第${match[2]}季度`;
        } else if (pattern.source.includes('月')) {
          return `${match[1]}年${match[2]}月`;
        } else if (pattern.source.includes('半年')) {
          return `${match[1]}年${match[2]}半年`;
        }
      }
    }
    
    // 如果没有匹配到，返回文件名（去掉扩展名）
    return filename.replace(/\.[^/.]+$/, '');
  }

  parsePerformanceData(headers, rows, defaultPeriod = null) {
    // 该方法现在仅用于兼容旧逻辑，实际解析已转移到 parseSingleEmployeeTable
    return [];
  }

  // 新增：按员工分割数据为小表
  splitIntoEmployeeTables(headers, rows) {
    const tables = [];
    let currentTable = null;
    
    rows.forEach((row, index) => {
      const nameIndex = headers.findIndex(h => String(h).includes('姓名'));
      const employeeName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
      
      // 如果找到新的员工姓名，创建新表
      if (employeeName && employeeName !== '姓名' && employeeName !== '工号') {
        if (currentTable) {
          tables.push(currentTable);
        }
        currentTable = {
          headers: headers,
          rows: [row],
          employeeName: employeeName
        };
      } else if (currentTable) {
        // 添加到当前员工表
        currentTable.rows.push(row);
      }
    });
    
    if (currentTable) {
      tables.push(currentTable);
    }
    
    return tables;
  }

  // 新增：解析单个员工的小表
  parseSingleEmployeeTable(headers, rows, employeeName, defaultPeriod) {
    const data = [];
    const columnMap = this.mapColumns(headers);
    
    if (!employeeName || employeeName === '姓名' || employeeName === '工号') {
      return [];
    }
    
    // 获取员工基本信息（从第一行获取）
    const firstRow = rows[0] || [];
    const employeeInfo = {
      name: employeeName,
      id: firstRow[columnMap.employeeId] ? String(firstRow[columnMap.employeeId]).trim() : '',
      department: firstRow[columnMap.department] ? String(firstRow[columnMap.department]).trim() : '',
      position: firstRow[columnMap.position] ? String(firstRow[columnMap.position]).trim() : '',
      evaluationForm: firstRow[columnMap.evaluationForm] ? String(firstRow[columnMap.evaluationForm]).trim() : '',
      evaluationPeriod: firstRow[columnMap.period] ? String(firstRow[columnMap.period]).trim() : defaultPeriod,
      currentNode: firstRow[columnMap.currentNode] ? String(firstRow[columnMap.currentNode]).trim() : '',
      level: firstRow[columnMap.level] ? String(firstRow[columnMap.level]).trim() : '',
      evaluator: firstRow[columnMap.evaluator] ? String(firstRow[columnMap.evaluator]).trim() : '',
      evaluationDate: this.parseDate(firstRow[columnMap.date])
    };
    
    // 遍历该员工的所有指标行
    rows.forEach((row, index) => {
      const dimensionName = row[columnMap.dimensionName] ? String(row[columnMap.dimensionName]).trim() : '';
      const indicatorName = row[columnMap.indicatorName] ? String(row[columnMap.indicatorName]).trim() : '';
      
      // 过滤掉总分、总评等无用数据
      const isValidIndicator = indicatorName && 
        !indicatorName.includes('总分') && 
        !indicatorName.includes('总评') && 
        !indicatorName.includes('小计');
      
      if ((dimensionName || indicatorName) && isValidIndicator) {
        const record = {
          id: `${Date.now()}_${index}`,
          employeeName: employeeInfo.name,
          employeeId: employeeInfo.id,
          department: employeeInfo.department,
          position: employeeInfo.position,
          evaluationForm: employeeInfo.evaluationForm,
          evaluationPeriod: employeeInfo.evaluationPeriod,
          currentNode: employeeInfo.currentNode,
          dimensionName: dimensionName,
          indicatorName: indicatorName,
          assessmentStandard: row[columnMap.evaluationStandard] ? String(row[columnMap.evaluationStandard]).trim() : '',
          weight: this.parseWeight(row[columnMap.weight]),
          
          // 评估结果 - 基础字段
          selfEvaluationResult: row[columnMap.selfEvaluationResult] ? String(row[columnMap.selfEvaluationResult]).trim() : '',
          selfEvaluationRemark: row[columnMap.selfEvaluationRemark] ? String(row[columnMap.selfEvaluationRemark]).trim() : '',
          supervisorEvaluationResult: row[columnMap.supervisorEvaluationResult] ? String(row[columnMap.supervisorEvaluationResult]).trim() : '',
          supervisorEvaluationRemark: row[columnMap.supervisorEvaluationRemark] ? String(row[columnMap.supervisorEvaluationRemark]).trim() : '',
          
          level: employeeInfo.level,
          performanceResult: row[columnMap.performanceResult] ? String(row[columnMap.performanceResult]).trim() : '',
          evaluator: employeeInfo.evaluator,
          evaluationDate: employeeInfo.evaluationDate,
          comments: row[columnMap.comments] ? String(row[columnMap.comments]).trim() : '',
          rawRowIndex: index + 2
        };
        
        // 处理360°评分字段 - 使用mapColumns中收集的字段映射
        columnMap.peerEvaluationFields.forEach(field => {
          if (field.type === 'result') {
            const originalHeader = field.key;
            
            // 提取评价人姓名
            let reviewerName = null;
            const match = originalHeader.match(/^360°评分-([^（(]+)/);
            if (match && match[1]) {
              reviewerName = match[1].trim();
            }
            
            if (reviewerName) {
              const resultValue = this.getCellValue(row, field.index);
              const remarkField = columnMap.peerEvaluationFields.find(f => 
                f.type === 'remark' && f.key.includes(reviewerName)
              );
              const remarkValue = remarkField ? this.getCellValue(row, remarkField.index) : '';
              
              // 动态添加评价人字段
              record[`peerEvaluationResult_${reviewerName}`] = resultValue;
              record[`peerEvaluationRemark_${reviewerName}`] = remarkValue;
            }
          }
        });
        
        data.push(record);
      }
    });
    
    return data;
  }

  mapColumns(headers) {
    const map = {};
    map.peerEvaluationFields = [];
    
    headers.forEach((header, index) => {
      const headerStr = String(header || '').toLowerCase();
      const originalHeader = String(header || '').trim();
      
      // 基本信息
      if (headerStr.includes('姓名') || headerStr.includes('name')) {
        map.name = index;
      } else if (headerStr.includes('工号') || headerStr.includes('员工号') || headerStr.includes('id')) {
        map.employeeId = index;
      } else if (headerStr.includes('部门') || headerStr.includes('department')) {
        map.department = index;
      } else if (headerStr.includes('职位') || headerStr.includes('岗位') || headerStr.includes('position')) {
        map.position = index;
      }
      // 绩效信息 - 基础字段
      else if (headerStr.includes('所在考评表') || headerStr.includes('考评表') || headerStr.includes('评估表')) {
        map.evaluationForm = index;
      } else if (headerStr.includes('周期') || headerStr.includes('期间') || headerStr.includes('period')) {
        map.period = index;
      } else if (headerStr.includes('绩效等级') || headerStr.includes('等级') || headerStr.includes('级别') || headerStr.includes('level')) {
        map.level = index;
      } else if (originalHeader === '绩效结果') {
        // 修复：使用精确匹配，避免重复匹配
        console.log(`找到绩效结果列，索引: ${index}`);
        map.performanceResult = index;
      } else if (headerStr.includes('当前节点') || headerStr.includes('节点')) {
        map.currentNode = index;
      }
      // 维度和指标 - 使用原始表头进行精确匹配
      else if (originalHeader === '维度名称') {
        map.dimensionName = index;
      } else if (originalHeader === '指标名称') {
        map.indicatorName = index;
      } else if (headerStr.includes('考核标准') || headerStr.includes('标准')) {
        map.evaluationStandard = index;
      } else if (headerStr.includes('权重') || headerStr.includes('weight')) {
        map.weight = index;
      }
      // 自评 (修复匹配逻辑 - 匹配带人名的格式)
      else if (headerStr.includes('自评-') && !headerStr.includes('说明')) {
        map.selfEvaluationResult = index;
      } else if (headerStr.includes('自评') && headerStr.includes('说明')) {
        map.selfEvaluationRemark = index;
      }
      // 360°评分字段 - 仅收集索引，不预设键名
      else if (originalHeader.startsWith('360°评分-')) {
        if (originalHeader.includes('评分说明')) {
          // 评分说明字段
          map.peerEvaluationFields.push({
            key: originalHeader, // 保持原始表头
            index: index,
            type: 'remark'
          });
        } else {
          // 评分结果字段
          map.peerEvaluationFields.push({
            key: originalHeader, // 保持原始表头
            index: index,
            type: 'result'
          });
        }
      }
      // 上级评分 (修复匹配逻辑 - 匹配带人名和权重的格式)
      else if (headerStr.includes('上级评分-') && headerStr.includes('100.0%')) {
        map.supervisorEvaluationResult = index;
      } else if (headerStr === '上级评分') {
        // 如果没有找到带权重的上级评分，使用这个作为备选
        if (!map.supervisorEvaluationResult) {
          map.supervisorEvaluationResult = index;
        }
      }
      // 上级评分说明
      else if (headerStr.includes('上级评分') && headerStr.includes('说明')) {
        map.supervisorEvaluationRemark = index;
      }
      // 原有字段保持不变（删除总分相关映射）
      else if (headerStr.includes('评价人') || headerStr.includes('考核人') || headerStr.includes('evaluator')) {
        map.evaluator = index;
      } else if (headerStr.includes('日期') || headerStr.includes('时间') || headerStr.includes('date')) {
        map.date = index;
      } else if (headerStr.includes('备注') || headerStr.includes('评语') || headerStr.includes('comment')) {
        map.comments = index;
      }
    });
    
    // 调试输出，帮助确认映射结果
    // 添加调试日志
    console.log('列映射结果:', map);
    return map;
  }

  getCellValue(row, columnIndex) {
    if (columnIndex === undefined || columnIndex === null) return '';
    const value = row[columnIndex];
    return value !== undefined && value !== null ? String(value).trim() : '';
  }

  // 可以删除这个方法，因为不再需要解析总分
  // parseScore(scoreStr) {
  //   if (!scoreStr) return null;
  //   const score = parseFloat(scoreStr);
  //   return isNaN(score) ? null : score;
  // }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  detectPeriods(data) {
    const periods = new Set();
    data.forEach(record => {
      if (record.evaluationPeriod) {
        periods.add(record.evaluationPeriod);
      }
    });
    return Array.from(periods);
  }

  parseWeight(weightStr) {
    if (!weightStr) return null;
    
    const str = String(weightStr).trim();
    // 处理百分比格式
    if (str.includes('%')) {
      const num = parseFloat(str.replace('%', ''));
      return isNaN(num) ? null : num / 100;
    }
    
    // 处理小数格式
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    
    // 如果是大于1的数字，假设是百分比
    return num > 1 ? num / 100 : num;
  }
}

/**
 * POST /api/import/excel
 * Excel文件导入接口
 */
router.post('/excel', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的Excel文件'
    });
  }

  const filePath = req.file.path;
  const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  
  try {
    logger.info(`开始处理Excel文件: ${originalFilename}`);
    
    // 解析Excel文件 - 传入原始文件名
    const parser = new ExcelParserService();
    const parseResult = parser.parseExcelFile(filePath, originalFilename);
    
    // 保存数据
    const storage = new DataStorageService();
    const saveResult = await storage.savePerformanceData(parseResult.data, {
      originalFilename,
      detectedPeriods: parseResult.detectedPeriods,
      totalRecords: parseResult.totalRecords,
      headers: parseResult.headers
    });
    
    logger.info(`Excel导入成功: ${originalFilename}, 记录数: ${parseResult.totalRecords}`);
    
    res.json({
      success: true,
      message: '导入成功',
      data: parseResult.data,
      detectedPeriods: parseResult.detectedPeriods,
      totalRecords: parseResult.totalRecords,
      importId: saveResult.id
    });
    
  } catch (error) {
    logger.error(`Excel导入失败: ${originalFilename}`, error);
    
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: error.message
    });
  } finally {
    // 清理临时文件
    try {
      await fs.remove(filePath);
    } catch (cleanupError) {
      logger.warn('清理临时文件失败:', cleanupError);
    }
  }
}));

/**
 * GET /api/import/history
 * 获取导入历史记录
 */
router.get('/history', asyncHandler(async (req, res) => {
  const storage = new DataStorageService();
  const history = await storage.getImportHistory();
  
  res.json({
    success: true,
    data: history
  });
}));

/**
 * GET /api/import/performance
 * 获取所有绩效数据
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const storage = new DataStorageService();
  await storage.initDirectories();
  
  try {
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let allPerformanceData = [];
    let allPeriods = new Set();
    
    // 读取所有绩效文件
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        // 添加文件信息到每条记录
        const recordsWithFileInfo = fileContent.data.map(record => ({
          ...record,
          importFile: fileContent.metadata.originalFilename,
          importTime: fileContent.metadata.timestamp
        }));
        
        allPerformanceData = allPerformanceData.concat(recordsWithFileInfo);
        
        // 收集所有周期
        if (fileContent.metadata.detectedPeriods) {
          fileContent.metadata.detectedPeriods.forEach(period => allPeriods.add(period));
        }
      }
    }
    
    // 按导入时间排序（最新的在前）
    allPerformanceData.sort((a, b) => new Date(b.importTime) - new Date(a.importTime));
    
    res.json({
      success: true,
      data: {
        records: allPerformanceData,
        periods: Array.from(allPeriods),
        totalRecords: allPerformanceData.length,
        summary: {
          totalEmployees: new Set(allPerformanceData.map(r => r.employeeName)).size,
          totalPeriods: allPeriods.size,
          latestImport: allPerformanceData.length > 0 ? allPerformanceData[0].importTime : null
        }
      }
    });
  } catch (error) {
    logger.error('获取绩效数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取绩效数据失败',
      error: error.message
    });
  }
}));

/**
 * GET /api/import/performance/latest
 * 获取最新周期的绩效数据
 */
router.get('/performance/latest', asyncHandler(async (req, res) => {
  const storage = new DataStorageService();
  await storage.initDirectories();
  
  try {
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return res.json({
        success: true,
        data: {
          records: [],
          period: null,
          message: '暂无绩效数据'
        }
      });
    }
    
    // 按文件修改时间排序，获取最新的文件
    const filesWithStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(performanceDir, file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime, filePath };
      })
    );
    
    filesWithStats.sort((a, b) => b.mtime - a.mtime);
    const latestFile = filesWithStats[0];
    
    const fileContent = await fs.readJson(latestFile.filePath);
    
    res.json({
      success: true,
      data: {
        records: fileContent.data || [],
        period: fileContent.metadata.detectedPeriods?.[0] || fileContent.metadata.originalFilename,
        metadata: fileContent.metadata,
        totalRecords: fileContent.data?.length || 0
      }
    });
  } catch (error) {
    logger.error('获取最新绩效数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取最新绩效数据失败',
      error: error.message
    });
  }
}));

/**
 * DELETE /api/import/performance/employee/:employeeName
 * 删除员工的所有绩效记录
 */
router.delete('/performance/employee/:employeeName', asyncHandler(async (req, res) => {
  const { employeeName } = req.params;
  
  try {
    const storage = new DataStorageService();
    await storage.initDirectories();
    
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let deletedCount = 0;
    
    // 遍历所有绩效文件，删除指定员工的记录
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        const originalLength = fileContent.data.length;
        fileContent.data = fileContent.data.filter(record => 
          record.employeeName !== employeeName
        );
        
        const deletedInThisFile = originalLength - fileContent.data.length;
        deletedCount += deletedInThisFile;
        
        if (deletedInThisFile > 0) {
          // 更新元数据
          fileContent.metadata.totalRecords = fileContent.data.length;
          fileContent.metadata.lastModified = new Date().toISOString();
          
          // 保存更新后的文件
          await fs.writeJson(filePath, fileContent, { spaces: 2 });
        }
      }
    }
    
    logger.info(`删除员工 ${employeeName} 的绩效记录，共删除 ${deletedCount} 条`);
    
    res.json({
      success: true,
      message: `成功删除员工 ${employeeName} 的 ${deletedCount} 条绩效记录`,
      deletedCount
    });
    
  } catch (error) {
    logger.error(`删除员工 ${employeeName} 的绩效记录失败:`, error);
    res.status(500).json({
      success: false,
      message: '删除员工记录失败',
      error: error.message
    });
  }
}));

/**
 * DELETE /api/import/performance/indicator/:indicatorId
 * 删除指定的绩效指标
 */
router.delete('/performance/indicator/:indicatorId', asyncHandler(async (req, res) => {
  const { indicatorId } = req.params;
  
  try {
    const storage = new DataStorageService();
    await storage.initDirectories();
    
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let found = false;
    
    // 遍历所有绩效文件，查找并删除指定指标
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        const originalLength = fileContent.data.length;
        fileContent.data = fileContent.data.filter(record => record.id !== indicatorId);
        
        if (originalLength > fileContent.data.length) {
          found = true;
          
          // 更新元数据
          fileContent.metadata.totalRecords = fileContent.data.length;
          fileContent.metadata.lastModified = new Date().toISOString();
          
          // 保存更新后的文件
          await fs.writeJson(filePath, fileContent, { spaces: 2 });
          break;
        }
      }
    }
    
    if (found) {
      logger.info(`成功删除指标 ID: ${indicatorId}`);
      res.json({
        success: true,
        message: '删除指标成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '未找到指定的指标'
      });
    }
    
  } catch (error) {
    logger.error(`删除指标 ${indicatorId} 失败:`, error);
    res.status(500).json({
      success: false,
      message: '删除指标失败',
      error: error.message
    });
  }
}));

/**
 * PUT /api/import/performance/employee/:employeeName
 * 更新员工基本信息
 */
router.put('/performance/employee/:employeeName', asyncHandler(async (req, res) => {
  const { employeeName } = req.params;
  const updateData = req.body;
  
  try {
    const storage = new DataStorageService();
    await storage.initDirectories();
    
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let updatedCount = 0;
    
    // 遍历所有绩效文件，更新指定员工的信息
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        let hasUpdates = false;
        
        fileContent.data = fileContent.data.map(record => {
          if (record.employeeName === employeeName) {
            hasUpdates = true;
            updatedCount++;
            return {
              ...record,
              ...updateData,
              lastModified: new Date().toISOString()
            };
          }
          return record;
        });
        
        if (hasUpdates) {
          // 更新元数据
          fileContent.metadata.lastModified = new Date().toISOString();
          
          // 保存更新后的文件
          await fs.writeJson(filePath, fileContent, { spaces: 2 });
        }
      }
    }
    
    logger.info(`更新员工 ${employeeName} 的信息，共更新 ${updatedCount} 条记录`);
    
    res.json({
      success: true,
      message: `成功更新员工 ${employeeName} 的 ${updatedCount} 条记录`,
      updatedCount
    });
    
  } catch (error) {
    logger.error(`更新员工 ${employeeName} 信息失败:`, error);
    res.status(500).json({
      success: false,
      message: '更新员工信息失败',
      error: error.message
    });
  }
}));

/**
 * PUT /api/import/performance/indicator/:indicatorId
 * 更新指定的绩效指标信息
 */
router.put('/performance/indicator/:indicatorId', asyncHandler(async (req, res) => {
  const { indicatorId } = req.params;
  const updateData = req.body;
  
  try {
    const storage = new DataStorageService();
    await storage.initDirectories();
    
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let found = false;
    
    // 遍历所有绩效文件，查找并更新指定指标
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        let hasUpdates = false;
        
        fileContent.data = fileContent.data.map(record => {
          if (record.id === indicatorId) {
            found = true;
            hasUpdates = true;
            return {
              ...record,
              ...updateData,
              lastModified: new Date().toISOString()
            };
          }
          return record;
        });
        
        if (hasUpdates) {
          // 更新元数据
          fileContent.metadata.lastModified = new Date().toISOString();
          
          // 保存更新后的文件
          await fs.writeJson(filePath, fileContent, { spaces: 2 });
          break;
        }
      }
    }
    
    if (found) {
      logger.info(`成功更新指标 ID: ${indicatorId}`);
      res.json({
        success: true,
        message: '更新指标成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '未找到指定的指标'
      });
    }
    
  } catch (error) {
    logger.error(`更新指标 ${indicatorId} 失败:`, error);
    res.status(500).json({
      success: false,
      message: '更新指标失败',
      error: error.message
    });
  }
}));

module.exports = router;

/**
 * POST /api/import/performance/indicator
 * 创建新的绩效指标
 */
router.post('/performance/indicator', asyncHandler(async (req, res) => {
  const indicatorData = req.body;
  
  try {
    const storage = new DataStorageService();
    await storage.initDirectories();
    
    const performanceDir = path.join(__dirname, '../data/performance');
    const files = await fs.readdir(performanceDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // 查找对应员工和考核周期的文件
    let targetFile = null;
    let targetFileContent = null;
    
    for (const file of jsonFiles) {
      const filePath = path.join(performanceDir, file);
      const fileContent = await fs.readJson(filePath);
      
      if (fileContent.data && Array.isArray(fileContent.data)) {
        // 检查是否存在相同员工和考核周期的记录
        const hasMatchingEmployee = fileContent.data.some(record => 
          record.employeeName === indicatorData.employeeName && 
          record.evaluationPeriod === indicatorData.evaluationPeriod
        );
        
        if (hasMatchingEmployee) {
          targetFile = filePath;
          targetFileContent = fileContent;
          break;
        }
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的员工绩效记录文件'
      });
    }
    
    // 生成新的指标ID
    const timestamp = Date.now();
    const maxId = targetFileContent.data.reduce((max, record) => {
      const idParts = record.id.split('_');
      const recordIndex = parseInt(idParts[1]) || 0;
      return Math.max(max, recordIndex);
    }, -1);
    
    const newIndicatorId = `${timestamp}_${maxId + 1}`;
    
    // 创建新指标记录
    const newIndicatorRecord = {
      id: newIndicatorId,
      employeeName: indicatorData.employeeName,
      employeeId: indicatorData.employeeId || '',
      department: indicatorData.department || '',
      position: '',
      evaluationForm: indicatorData.evaluationForm || '',
      evaluationPeriod: indicatorData.evaluationPeriod || '',
      currentNode: indicatorData.currentNode || '',
      dimensionName: indicatorData.dimensionName || '',
      indicatorName: indicatorData.indicatorName,
      assessmentStandard: indicatorData.assessmentStandard || '',
      weight: indicatorData.weight,
      selfEvaluationResult: indicatorData.selfEvaluationResult || '',
      peerEvaluationResult: indicatorData.peerEvaluationResult || '',
      supervisorEvaluationResult: indicatorData.supervisorEvaluationResult || '',
      level: targetFileContent.data[0]?.level || '',
      evaluator: targetFileContent.data[0]?.evaluator || '',
      evaluationDate: targetFileContent.data[0]?.evaluationDate || null,
      comments: '',
      rawRowIndex: targetFileContent.data.length + 2,
      createdAt: new Date().toISOString()
    };
    
    // 添加新指标到数据中
    targetFileContent.data.push(newIndicatorRecord);
    
    // 更新元数据
    targetFileContent.metadata.totalRecords = targetFileContent.data.length;
    targetFileContent.metadata.lastModified = new Date().toISOString();
    
    // 保存更新后的文件
    await fs.writeJson(targetFile, targetFileContent, { spaces: 2 });
    
    logger.info(`成功创建新指标，员工: ${indicatorData.employeeName}, 指标: ${indicatorData.indicatorName}`);
    res.json({
      success: true,
      message: '新增指标成功',
      data: {
        id: newIndicatorId,
        indicatorName: indicatorData.indicatorName
      }
    });
    
  } catch (error) {
    logger.error('创建新指标失败:', error);
    res.status(500).json({
      success: false,
      message: '创建新指标失败',
      error: error.message
    });
  }
}));




