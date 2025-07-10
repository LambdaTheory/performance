#!/usr/bin/env node

/**
 * 飞书API工具类
 * 处理所有飞书API调用逻辑
 */

const axios = require('axios');

class FeishuAPI {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.baseUrl = 'https://open.feishu.cn/open-apis';
  }

  // 获取 tenant_access_token
  async getTenantAccessToken() {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
        app_id: this.appId,
        app_secret: this.appSecret
      });

      if (response.data.code !== 0) {
        throw new Error(`API错误: ${response.data.msg}`);
      }

      return response.data.tenant_access_token;
    } catch (error) {
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

  // 获取指定部门的子部门（测试接口是否可用）
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

  // 测试子部门接口是否可用
  async testChildrenEndpoint(tenantAccessToken) {
    try {
      console.log('🧪 测试子部门接口...');
      
      // 先获取所有部门
      const departments = await this.getDepartments(tenantAccessToken);
      
      if (departments.length === 0) {
        console.log('   ⚠️  没有找到任何部门，无法测试子部门接口');
        return { available: false, reason: 'no_departments' };
      }
      
      // 对每个部门测试子部门接口
      for (const dept of departments) {
        try {
          console.log(`   📂 测试部门 "${dept.name || dept.department_id}" 的子部门接口...`);
          const children = await this.getDepartmentChildren(dept.department_id, tenantAccessToken);
          console.log(`   ✅ 接口可用，返回 ${children.length} 个子部门`);
          return { available: true, departmentId: dept.department_id, childrenCount: children.length };
        } catch (error) {
          console.log(`   ❌ 接口测试失败: ${error.message}`);
          if (error.message.includes('接口已废弃')) {
            return { available: false, reason: 'deprecated', error: error.message };
          }
        }
      }
      
      return { available: false, reason: 'all_failed' };
    } catch (error) {
      console.error('❌ 测试子部门接口时出错:', error.message);
      return { available: false, reason: 'test_error', error: error.message };
    }
  }

  // 延迟函数
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = FeishuAPI;