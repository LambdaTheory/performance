/**
 * 认证相关路由
 * 处理飞书OAuth认证流程
 */

const express = require('express');
const router = express.Router();
const FeishuAPI = require('../services/feishuAPI');
const logger = require('../utils/logger');

const feishuAPI = new FeishuAPI();

/**
 * 飞书OAuth认证入口
 * GET /api/auth/feishu
 */
router.get('/feishu', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2);
    const redirectUri = process.env.FEISHU_REDIRECT_URI;
    const appId = process.env.FEISHU_APP_ID;
    
    if (!redirectUri || !appId) {
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }

    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index` +
      `?app_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${state}`;

    // 在生产环境中，应该将state存储到session或数据库中进行验证
    res.json({
      success: true,
      authUrl,
      state
    });

  } catch (error) {
    logger.error('生成飞书认证URL失败:', error);
    res.status(500).json({
      success: false,
      message: '认证服务异常'
    });
  }
});

/**
 * 飞书OAuth回调处理 - 接收前端传来的code
 * POST /api/auth/feishu/callback
 */
router.post('/feishu/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少授权码'
      });
    }

    logger.info('处理飞书OAuth回调', { code: code.substring(0, 10) + '...' });
    
    // 获取用户访问令牌
    const userTokenResponse = await feishuAPI.getUserAccessToken(code);
    
    if (!userTokenResponse.success) {
      logger.error('获取用户令牌失败:', userTokenResponse);
      return res.status(401).json({
        success: false,
        message: '获取用户令牌失败',
        details: userTokenResponse.details
      });
    }

    // 获取用户信息
    const userInfo = await feishuAPI.getUserInfo(userTokenResponse.access_token);
    
    if (!userInfo.success) {
      logger.error('获取用户信息失败:', userInfo);
      return res.status(401).json({
        success: false,
        message: '获取用户信息失败'
      });
    }

    // 检查用户是否为管理员
    const adminIds = process.env.ADMIN_IDS?.split(',') || [];
    const isAdmin = adminIds.includes(userInfo.data.user_id);

    logger.info('用户认证成功', { 
      userId: userInfo.data.user_id,
      name: userInfo.data.name,
      isAdmin 
    });

    // 返回用户信息（生产环境中应该生成JWT token）
    res.json({
      success: true,
      user: {
        id: userInfo.data.user_id,
        name: userInfo.data.name,
        avatar: userInfo.data.avatar_url,
        email: userInfo.data.email,
        isAdmin
      },
      token: userTokenResponse.access_token
    });

  } catch (error) {
    logger.error('飞书OAuth回调处理失败:', error);
    res.status(500).json({
      success: false,
      message: '认证回调处理异常'
    });
  }
});

module.exports = router;