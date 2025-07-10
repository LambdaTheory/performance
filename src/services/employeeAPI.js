/**
 * 员工相关API客户端
 * 调用后端员工同步服务
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

class EmployeeAPI {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30秒超时，因为同步可能需要时间
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加API密钥（如果配置了）
        if (process.env.REACT_APP_API_SECRET_KEY) {
          config.headers['X-API-Key'] = process.env.REACT_APP_API_SECRET_KEY;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        // 统一错误处理
        const message = error.response?.data?.message || error.message || '网络错误';
        return Promise.reject(new Error(message));
      }
    );
  }

  /**
   * 获取员工列表
   */
  async getEmployees(params = {}) {
    try {
      const response = await this.client.get('/employees', { params });
      return {
        success: true,
        data: response.data,
        pagination: response.pagination
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 获取单个员工详情
   */
  async getEmployee(id) {
    try {
      const response = await this.client.get(`/employees/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 触发员工同步
   */
  async syncEmployees() {
    try {
      const response = await this.client.post('/employees/sync');
      return response; // 直接返回后端响应
    } catch (error) {
      return {
        success: false,
        message: error.message,
        stats: {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          newUsers: 0,
          updatedUsers: 0,
          duplicateUsers: 0,
          errors: [error.message]
        }
      };
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    try {
      const response = await this.client.get('/employees/sync/status');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 验证飞书API权限
   */
  async validatePermissions() {
    try {
      const response = await this.client.get('/employees/sync/permissions');
      return response; // 直接返回后端响应
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 获取员工统计信息
   */
  async getEmployeeStats() {
    try {
      const response = await this.client.get('/employees/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 检查后端服务健康状态
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000 // 健康检查使用较短超时
      });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// 创建单例实例
const employeeAPI = new EmployeeAPI();

export default employeeAPI;