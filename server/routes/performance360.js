/**
 * 360°评价数据API路由 - 使用本地修复后的数据
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { asyncHandler } = require('../utils/middleware');
const logger = require('../utils/logger');

const router = express.Router();

// 修复后的360°评价数据文件路径
const DATA_FILE = path.join(__dirname, '..', 'data', 'performance', 'performance_1756720139164.json');

/**
 * GET /api/performance360/employees
 * 获取所有员工360°评价数据
 */
router.get('/employees', asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({
        success: false,
        message: '360°评价数据文件不存在，请先运行修复脚本'
      });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    res.json({
      success: true,
      data: data.employees || [],
      total: data.employees ? data.employees.length : 0,
      message: '360°评价数据获取成功'
    });
  } catch (error) {
    logger.error('获取360°评价数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
}));

/**
 * GET /api/performance360/employees/:name
 * 获取单个员工360°评价详情
 */
router.get('/employees/:name', asyncHandler(async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({
        success: false,
        message: '360°评价数据文件不存在'
      });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const employee = data.employees?.find(emp => emp.name === decodeURIComponent(name));
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `员工 ${name} 的360°评价数据不存在`
      });
    }

    res.json({
      success: true,
      data: employee,
      message: '员工360°评价详情获取成功'
    });
  } catch (error) {
    logger.error(`获取员工 ${req.params.name} 的360°评价数据失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
}));

/**
 * GET /api/performance360/verify
 * 验证360°评价人是否正确
 */
router.get('/verify', asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({
        success: false,
        message: '360°评价数据文件不存在'
      });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const verification = {};
    
    data.employees?.forEach(employee => {
      verification[employee.name] = {
        reviewers360: employee.reviewers360 || [],
        totalRecords: employee.records?.length || 0,
        has360Reviews: employee.review360 && Object.keys(employee.review360).length > 0
      };
    });

    // 检查是否有重复的评价人
    const allReviewers = new Set();
    let hasDuplicates = false;
    
    Object.values(verification).forEach(emp => {
      emp.reviewers360.forEach(reviewer => {
        if (allReviewers.has(reviewer)) {
          hasDuplicates = true;
        }
        allReviewers.add(reviewer);
      });
    });

    res.json({
      success: true,
      data: {
        totalEmployees: data.employees?.length || 0,
        verification,
        uniqueReviewers: Array.from(allReviewers).length,
        hasDuplicateReviewers: hasDuplicates,
        message: hasDuplicates ? '发现重复评价人' : '所有评价人均为独立个体'
      }
    });
  } catch (error) {
    logger.error('验证360°评价数据失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败',
      error: error.message
    });
  }
}));

/**
 * GET /api/performance360/raw-data
 * 获取原始修复后的完整数据
 */
router.get('/raw-data', asyncHandler(async (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({
        success: false,
        message: '360°评价数据文件不存在'
      });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    res.json({
      success: true,
      data: data,
      message: '原始数据获取成功',
      filePath: DATA_FILE
    });
  } catch (error) {
    logger.error('获取原始360°评价数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  }
}));

module.exports = router;