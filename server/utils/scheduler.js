/**
 * 定时任务调度器
 */

const cron = require('node-cron');
const EmployeeSyncService = require('../services/employeeSync');
const logger = require('./logger');

let syncJob = null;

/**
 * 启动定时同步任务
 */
function startCronJobs() {
  const cronSchedule = process.env.SYNC_CRON_SCHEDULE || '0 2 * * *'; // 默认每日凌晨2点
  
  if (!cron.validate(cronSchedule)) {
    logger.error('无效的cron表达式:', cronSchedule);
    return;
  }

  logger.info(`启动定时同步任务，计划: ${cronSchedule}`);

  syncJob = cron.schedule(cronSchedule, async () => {
    try {
      logger.info('开始执行定时员工同步任务');
      
      const syncService = new EmployeeSyncService();
      const result = await syncService.syncEmployees();
      
      if (result.success) {
        logger.info('定时员工同步完成', {
          stats: result.stats,
          duration: result.duration
        });
      } else {
        logger.error('定时员工同步失败:', result.message);
      }
    } catch (error) {
      logger.error('定时员工同步任务异常:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai' // 使用中国时区
  });

  logger.info('定时同步任务已启动');
}

/**
 * 停止定时任务
 */
function stopCronJobs() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    logger.info('定时同步任务已停止');
  }
}

/**
 * 获取定时任务状态
 */
function getCronJobStatus() {
  return {
    isRunning: syncJob ? syncJob.getStatus() === 'scheduled' : false,
    schedule: process.env.SYNC_CRON_SCHEDULE || '0 2 * * *',
    timezone: 'Asia/Shanghai',
    nextExecution: syncJob ? getNextExecution() : null
  };
}

/**
 * 获取下次执行时间
 */
function getNextExecution() {
  if (!syncJob) return null;
  
  try {
    // 这里可以使用cron-parser库来计算下次执行时间
    // 目前返回一个估计值
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    return tomorrow.toISOString();
  } catch (error) {
    logger.error('计算下次执行时间失败:', error);
    return null;
  }
}

/**
 * 手动触发同步任务
 */
async function triggerManualSync() {
  try {
    logger.info('手动触发员工同步任务');
    
    const syncService = new EmployeeSyncService();
    const result = await syncService.syncEmployees();
    
    logger.info('手动员工同步完成', {
      success: result.success,
      stats: result.stats,
      duration: result.duration
    });
    
    return result;
  } catch (error) {
    logger.error('手动员工同步失败:', error);
    return {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  getCronJobStatus,
  triggerManualSync
};