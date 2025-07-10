/**
 * 健康检查和系统状态API
 */

const express = require('express');
const { supabase } = require('../utils/database');
const logger = require('../utils/logger');
const { asyncHandler } = require('../utils/middleware');

const router = express.Router();

/**
 * GET /api/health
 * 基础健康检查
 */
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // 检查数据库连接
  let dbStatus = 'unknown';
  let dbLatency = null;
  
  try {
    const dbStartTime = Date.now();
    const { error } = await supabase
      .from('pt_employees')
      .select('id')
      .limit(1);
    
    dbLatency = Date.now() - dbStartTime;
    dbStatus = error ? 'error' : 'healthy';
  } catch (error) {
    dbStatus = 'error';
    logger.error('数据库健康检查失败:', error);
  }

  // 检查环境变量
  const envStatus = {
    feishuConfigured: !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET),
    supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    corsConfigured: !!process.env.CORS_ORIGIN
  };

  const responseTime = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy' && envStatus.feishuConfigured && envStatus.supabaseConfigured;

  const health = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: responseTime,
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      configuration: envStatus
    }
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(health);
}));

/**
 * GET /api/health/detailed
 * 详细系统状态
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // 基础系统信息
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    timestamp: new Date().toISOString()
  };

  // 数据库详细状态
  let dbDetails = {
    status: 'unknown',
    latency: null,
    employeeCount: null,
    lastSyncTime: null
  };

  try {
    const dbStartTime = Date.now();
    
    // 检查员工表
    const { data: employees, error: employeeError } = await supabase
      .from('pt_employees')
      .select('id, last_sync_time', { count: 'exact' })
      .order('last_sync_time', { ascending: false })
      .limit(1);

    dbDetails.latency = Date.now() - dbStartTime;
    
    if (employeeError) {
      dbDetails.status = 'error';
      dbDetails.error = employeeError.message;
    } else {
      dbDetails.status = 'healthy';
      dbDetails.employeeCount = employees?.length || 0;
      dbDetails.lastSyncTime = employees?.[0]?.last_sync_time;
    }
  } catch (error) {
    dbDetails.status = 'error';
    dbDetails.error = error.message;
    logger.error('详细数据库检查失败:', error);
  }

  // 环境配置状态
  const configStatus = {
    feishu: {
      appId: !!process.env.FEISHU_APP_ID,
      appSecret: !!process.env.FEISHU_APP_SECRET,
      configured: !!(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET)
    },
    supabase: {
      url: !!process.env.SUPABASE_URL,
      serviceKey: !!process.env.SUPABASE_SERVICE_KEY,
      configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
    },
    server: {
      port: process.env.PORT || 3001,
      nodeEnv: process.env.NODE_ENV,
      corsOrigin: process.env.CORS_ORIGIN,
      autoSyncEnabled: process.env.AUTO_SYNC_ENABLED === 'true'
    }
  };

  // 同步状态
  const syncStatus = {
    autoSyncEnabled: process.env.AUTO_SYNC_ENABLED === 'true',
    cronSchedule: process.env.SYNC_CRON_SCHEDULE,
    lastSyncTime: dbDetails.lastSyncTime
  };

  const responseTime = Date.now() - startTime;
  const isHealthy = dbDetails.status === 'healthy' && 
                   configStatus.feishu.configured && 
                   configStatus.supabase.configured;

  const detailedHealth = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    responseTime: responseTime,
    system: systemInfo,
    database: dbDetails,
    configuration: configStatus,
    sync: syncStatus
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(detailedHealth);
}));

/**
 * GET /api/health/ping
 * 简单的ping测试
 */
router.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;