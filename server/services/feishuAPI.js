/**
 * 飞书API服务 - 后端版本
 * 处理所有飞书API调用逻辑
 */

const axios = require('axios');
const logger = require('../utils/logger');

class FeishuAPI {
  constructor() {
    this.appId = process.env.FEISHU_APP_ID;
    this.appSecret = process.env.FEISHU_APP_SECRET;
    this.baseUrl = 'https://open.feishu.cn/open-apis';
    
    if (!this.appId || !this.appSecret) {
      throw new Error('Missing required environment variables: FEISHU_APP_ID, FEISHU_APP_SECRET');
    }
  }

  // 获取 tenant_access_token
  async getTenantAccessToken() {
    try {
      logger.debug('获取飞书访问令牌');
      
      const response = await axios.post(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
        app_id: this.appId,
        app_secret: this.appSecret
      });

      if (response.data.code !== 0) {
        throw new Error(`飞书API错误: ${response.data.msg}`);
      }

      logger.debug('访问令牌获取成功');
      return response.data.tenant_access_token;
    } catch (error) {
      logger.error('获取访问令牌失败:', error.message);
      throw new Error(`获取访问令牌失败: ${error.message}`);
    }
  }

  // 获取部门列表
  async getDepartments(tenantAccessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/contact/v3/departments`, {
        headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
        params: { 
          page_size: '50', 
          department_id_type: 'department_id' 
        }
      });

      if (response.data.code !== 0) {
        throw new Error(`获取部门失败: ${response.data.msg}`);
      }

      return response.data.data?.items || [];
    } catch (error) {
      logger.error('获取部门失败:', error.message);
      throw new Error(`获取部门失败: ${error.message}`);
    }
  }

  // 按部门获取用户（核心方法）
  async getUsersByDepartment(departmentId, tenantAccessToken, options = {}) {
    const { pageSize = 50, pageToken = '', userIdType = 'user_id', departmentIdType = 'department_id' } = options;
    
    try {
      const params = new URLSearchParams({
        department_id: departmentId,
        page_size: pageSize.toString(),
        user_id_type: userIdType,
        department_id_type: departmentIdType
      });
      
      if (pageToken) {
        params.append('page_token', pageToken);
      }
      
      const response = await axios.get(`${this.baseUrl}/contact/v3/users/find_by_department`, {
        headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
        params: params
      });
      
      if (response.data.code !== 0) {
        throw new Error(`获取部门用户失败: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      // 提供更详细的错误信息
      if (error.response?.data) {
        const errorData = error.response.data;
        throw new Error(`获取部门 ${departmentId} 用户失败: ${errorData.msg || error.message} (错误码: ${errorData.code})`);
      }
      throw new Error(`获取部门 ${departmentId} 用户失败: ${error.message}`);
    }
  }

  // 获取所有用户（分页处理）
  async getAllUsersByDepartment(departmentId, tenantAccessToken, options = {}) {
    const allUsers = [];
    let pageToken = '';
    let hasMore = true;
    
    while (hasMore) {
      const result = await this.getUsersByDepartment(departmentId, tenantAccessToken, { pageToken, ...options });
      const users = result?.items || [];
      allUsers.push(...users);
      
      hasMore = result?.has_more || false;
      pageToken = result?.page_token || '';
      
      // 添加延迟避免频率限制
      if (hasMore) {
        await this.sleep(100);
      }
    }
    
    return allUsers;
  }

  // 获取指定部门的子部门
  async getDepartmentChildren(departmentId, tenantAccessToken, options = {}) {
    const { departmentIdType = 'department_id' } = options;
    
    try {
      const response = await axios.get(`${this.baseUrl}/contact/v3/departments/${departmentId}/children`, {
        headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
        params: { 
          page_size: '50', 
          department_id_type: departmentIdType
        }
      });

      if (response.data.code !== 0) {
        throw new Error(`获取子部门失败: ${response.data.msg}`);
      }

      return response.data.data?.items || [];
    } catch (error) {
      // 如果是404或者其他HTTP错误，说明接口可能已经废弃
      if (error.response?.status === 404) {
        throw new Error(`接口已废弃: /contact/v3/departments/${departmentId}/children`);
      }
      throw new Error(`获取部门 ${departmentId} 的子部门失败: ${error.message}`);
    }
  }

  // 验证API权限
  async validatePermissions(tenantAccessToken) {
    const tests = [
      {
        name: '用户列表API',
        test: () => this.getUsersByDepartment('0', tenantAccessToken, { pageSize: 1 })
      },
      {
        name: '部门列表API',
        test: () => this.getDepartments(tenantAccessToken)
      },
      {
        name: '子部门API',
        test: () => this.getDepartmentChildren('0', tenantAccessToken)
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        await test.test();
        results.push({ name: test.name, status: 'success' });
        logger.debug(`权限检查成功: ${test.name}`);
      } catch (error) {
        results.push({ name: test.name, status: 'failed', error: error.message });
        logger.warn(`权限检查失败: ${test.name} - ${error.message}`);
      }
    }

    return results;
  }

  // 获取用户访问令牌
  async getUserAccessToken(code) {
    try {
      logger.debug('开始获取用户访问令牌', { code: code.substring(0, 10) + '...' });
      
      const requestData = {
        grant_type: 'authorization_code',
        app_id: this.appId,
        app_secret: this.appSecret,
        code: code,
        redirect_uri: process.env.FEISHU_REDIRECT_URI
      };
      
      logger.debug('请求参数:', {
        grant_type: requestData.grant_type,
        app_id: requestData.app_id,
        redirect_uri: requestData.redirect_uri,
        code: code.substring(0, 10) + '...'
      });

      const response = await axios.post(`${this.baseUrl}/authen/v1/access_token`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.debug('飞书API响应:', { 
        status: response.status, 
        code: response.data?.code,
        msg: response.data?.msg 
      });

      if (response.data.code !== 0) {
        throw new Error(`获取用户令牌失败: ${response.data.msg}`);
      }

      return {
        success: true,
        access_token: response.data.data.access_token,
        refresh_token: response.data.data.refresh_token,
        expires_in: response.data.data.expires_in
      };
    } catch (error) {
      logger.error('获取用户访问令牌失败:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // 获取用户信息
  async getUserInfo(userAccessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/authen/v1/user_info`, {
        headers: { 'Authorization': `Bearer ${userAccessToken}` }
      });

      if (response.data.code !== 0) {
        throw new Error(`获取用户信息失败: ${response.data.msg}`);
      }

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      logger.error('获取用户信息失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 延迟函数
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = FeishuAPI;