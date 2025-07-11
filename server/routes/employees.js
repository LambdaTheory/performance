/**
 * 员工相关API路由
 */

const express = require('express');
const Joi = require('joi');
const EmployeeSyncService = require('../services/employeeSync');
const { supabase } = require('../utils/database');
const logger = require('../utils/logger');
const { asyncHandler, validateRequest } = require('../utils/middleware');

const router = express.Router();

const TABLES = {
  EMPLOYEES: 'pt_employees'
};

// 验证查询参数的schema
const getEmployeesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(100)
  })
};

/**
 * GET /api/employees
 * 获取员工列表
 */
router.get('/', validateRequest(getEmployeesSchema), asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const offset = (page - 1) * limit;

  // 构建查询
  let query = supabase
    .from(TABLES.EMPLOYEES)
    .select('*', { count: 'exact' });

  // 添加过滤条件
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // 分页和排序
  query = query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('获取员工列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取员工列表失败',
      error: error.message
    });
  }

  res.json({
    success: true,
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}));

/**
 * GET /api/employees/:id
 * 获取单个员工详情
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from(TABLES.EMPLOYEES)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        message: '员工不存在'
      });
    }
    
    logger.error('获取员工详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取员工详情失败',
      error: error.message
    });
  }

  res.json({
    success: true,
    data: data
  });
}));

/**
 * POST /api/employees/sync
 * 触发员工同步
 */
router.post('/sync', asyncHandler(async (req, res) => {
  logger.info('收到员工同步请求', { ip: req.ip });

  const syncService = new EmployeeSyncService();
  const result = await syncService.syncEmployees();

  const statusCode = result.success ? 200 : 500;
  
  logger.info('员工同步请求完成', {
    success: result.success,
    stats: result.stats,
    duration: result.duration
  });

  res.status(statusCode).json(result);
}));

/**
 * GET /api/employees/sync/status
 * 获取最近的同步状态（从日志或缓存中获取）
 */
router.get('/sync/status', asyncHandler(async (req, res) => {
  // 这里可以从数据库或缓存中获取最近的同步记录
  // 目前返回简单的状态信息
  
  const { data, error } = await supabase
    .from(TABLES.EMPLOYEES)
    .select('last_sync_time')
    .order('last_sync_time', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('获取同步状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取同步状态失败'
    });
  }

  const lastSyncTime = data?.last_sync_time;
  
  res.json({
    success: true,
    data: {
      lastSyncTime: lastSyncTime,
      status: lastSyncTime ? 'completed' : 'never_synced',
      nextScheduledSync: process.env.SYNC_CRON_SCHEDULE ? '每日凌晨2点' : null
    }
  });
}));

/**
 * GET /api/employees/sync/permissions
 * 验证飞书API权限
 */
router.get('/sync/permissions', asyncHandler(async (req, res) => {
  const syncService = new EmployeeSyncService();
  const result = await syncService.validateFeishuPermissions();

  const statusCode = result.success ? 200 : 500;
  res.status(statusCode).json(result);
}));

/**
 * GET /api/employees/stats
 * 获取员工统计信息
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // 获取基本统计
    const { data: totalCount } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id', { count: 'exact' });

    const { data: activeCount } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    const { data: recentSync } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('last_sync_time')
      .order('last_sync_time', { ascending: false })
      .limit(1);

    // 获取部门分布
    const { data: employees } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('department_ids')
      .eq('is_active', true);

    // 统计部门分布
    const departmentStats = {};
    employees?.forEach(emp => {
      const deptIds = emp.department_ids || [];
      deptIds.forEach(deptId => {
        departmentStats[deptId] = (departmentStats[deptId] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        total: totalCount?.length || 0,
        active: activeCount?.length || 0,
        inactive: (totalCount?.length || 0) - (activeCount?.length || 0),
        lastSyncTime: recentSync?.[0]?.last_sync_time,
        departmentDistribution: departmentStats
      }
    });

  } catch (error) {
    logger.error('获取员工统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取员工统计失败',
      error: error.message
    });
  }
}));

module.exports = router;