/**
 * Performance Survey System Backend API
 * 主服务器入口文件
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { initializeDatabase } = require('./utils/database');
const { startCronJobs } = require('./utils/scheduler');

// 路由导入
const employeeRoutes = require('./routes/employees');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: 'Too many requests',
    message: '请求过于频繁，请稍后再试'
  }
});
app.use('/api/', limiter);

// 特殊的同步接口限制 (更严格)
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 3, // 每5分钟最多3次同步请求
  message: {
    error: 'Sync rate limit exceeded',
    message: '同步请求过于频繁，请等待5分钟后再试'
  }
});
app.use('/api/employees/sync', syncLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// 路由配置
app.use('/api/health', healthRoutes);
app.use('/api/employees', employeeRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'Performance Survey System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// 服务器启动
async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();
    logger.info('数据库初始化完成');

    // 启动定时任务
    if (process.env.AUTO_SYNC_ENABLED === 'true') {
      startCronJobs();
      logger.info('定时同步任务已启动');
    }

    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`服务器已启动: http://localhost:${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
      logger.info(`CORS Origin: ${process.env.CORS_ORIGIN}`);
    });

  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，开始优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，开始优雅关闭...');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();