/**
 * 通用中间件工具
 */

const logger = require('./logger');

/**
 * 异步路由处理器包装器
 * 自动捕获异步函数中的错误
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 请求验证中间件
 * 使用Joi schema验证请求参数
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.query 
      ? schema.query.validate(req.query)
      : schema.body 
        ? schema.body.validate(req.body)
        : { error: null, value: req };

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn('请求参数验证失败:', { error: errorMessage, path: req.path });
      
      return res.status(400).json({
        success: false,
        message: '请求参数无效',
        details: errorMessage
      });
    }

    // 将验证后的值替换原始值
    if (schema.query) {
      req.query = value;
    } else if (schema.body) {
      req.body = value;
    }

    next();
  };
}

/**
 * API密钥验证中间件
 */
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedApiKey = process.env.API_SECRET_KEY;

  if (!expectedApiKey) {
    // 如果没有配置API密钥，跳过验证
    return next();
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('API密钥验证失败:', { ip: req.ip, path: req.path });
    
    return res.status(401).json({
      success: false,
      message: 'API密钥无效或缺失'
    });
  }

  next();
}

/**
 * 请求ID中间件
 * 为每个请求生成唯一ID
 */
function requestId(req, res, next) {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * CORS预检处理
 */
function handleCors(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');

  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}

/**
 * 错误响应格式化
 */
function formatErrorResponse(err, req, res, next) {
  // 默认错误状态码
  const statusCode = err.statusCode || err.status || 500;
  
  // 错误响应对象
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details;
  }

  // 记录错误日志
  logger.error('API错误:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });

  res.status(statusCode).json(errorResponse);
}

/**
 * 404处理中间件
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString()
  });
}

/**
 * 响应时间中间件
 */
function responseTime(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`请求完成: ${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      requestId: req.id
    });
  });
  
  next();
}

module.exports = {
  asyncHandler,
  validateRequest,
  validateApiKey,
  requestId,
  handleCors,
  formatErrorResponse,
  notFound,
  responseTime
};