#!/usr/bin/env node

/**
 * 飞书应用权限检查脚本
 * 
 * 用于诊断当前应用的权限配置，帮助用户了解需要申请哪些权限
 */

const axios = require('axios');
require('dotenv').config();

class FeishuPermissionChecker {
  constructor() {
    this.appId = process.env.REACT_APP_FEISHU_APP_ID;
    this.appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    this.baseUrl = 'https://open.feishu.cn/open-apis';
    
    if (!this.appId || !this.appSecret) {
      console.error('❌ 缺少必要的环境变量:');
      console.error('   REACT_APP_FEISHU_APP_ID');
      console.error('   REACT_APP_FEISHU_APP_SECRET');
      process.exit(1);
    }
    
    console.log('🔍 飞书应用权限检查工具');
    console.log(`📱 App ID: ${this.appId.substring(0, 8)}...`);
  }

  // 获取 tenant_access_token
  async getTenantAccessToken() {
    try {
      console.log('\n🔐 获取 tenant_access_token...');
      
      const response = await axios.post(`${this.baseUrl}/auth/v3/tenant_access_token/internal`, {
        app_id: this.appId,
        app_secret: this.appSecret
      });

      if (response.data.code !== 0) {
        throw new Error(`API错误: ${response.data.msg}`);
      }

      console.log('✅ tenant_access_token 获取成功');
      return response.data.tenant_access_token;
    } catch (error) {
      console.error('❌ tenant_access_token 获取失败:', error.message);
      throw error;
    }
  }

  // 检查具体权限
  async checkSpecificPermissions(tenantAccessToken) {
    console.log('\n🧪 测试具体API权限...\n');
    
    const tests = [
      {
        name: '用户列表API',
        description: '获取用户基本信息',
        permission: 'contact:user.base:readonly',
        test: async () => {
          const response = await axios.get(`${this.baseUrl}/contact/v3/users`, {
            headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
            params: { page_size: '1', user_id_type: 'user_id' }
          });
          return { success: true, data: response.data };
        }
      },
      {
        name: '部门列表API',
        description: '获取部门基础信息',
        permission: 'contact:department.base:readonly',
        test: async () => {
          const response = await axios.get(`${this.baseUrl}/contact/v3/departments`, {
            headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
            params: { page_size: '1', department_id_type: 'department_id' }
          });
          return { success: true, data: response.data };
        }
      },
      {
        name: '按部门获取用户API',
        description: '通过部门获取用户列表',
        permission: 'contact:user.department:readonly',
        test: async () => {
          const response = await axios.get(`${this.baseUrl}/contact/v3/users/find_by_department`, {
            headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
            params: { 
              department_id: '0',
              page_size: '1', 
              user_id_type: 'user_id' 
            }
          });
          return { success: true, data: response.data };
        }
      },
      {
        name: '子部门列表API',
        description: '获取指定部门的子部门列表',
        permission: 'contact:department.base:readonly',
        test: async () => {
          const response = await axios.get(`${this.baseUrl}/contact/v3/departments/0/children`, {
            headers: { 'Authorization': `Bearer ${tenantAccessToken}` },
            params: { 
              page_size: '10', 
              department_id_type: 'department_id' 
            }
          });
          return { success: true, data: response.data };
        }
      }
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`🔬 测试: ${test.name}`);
        const result = await test.test();
        
        if (result.data.code === 0) {
          console.log(`✅ ${test.name}: 权限正常`);
          if (result.data.data?.items) {
            console.log(`   📊 获取到 ${result.data.data.items.length} 条数据`);
          }
          results.push({ ...test, status: 'success', error: null });
        } else {
          console.log(`❌ ${test.name}: API错误 - ${result.data.msg}`);
          results.push({ ...test, status: 'api_error', error: result.data.msg });
        }
      } catch (error) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        
        if (status === 403) {
          console.log(`❌ ${test.name}: 权限不足`);
          console.log(`   📋 需要权限: ${test.permission}`);
          results.push({ ...test, status: 'permission_denied', error: '权限不足' });
        } else if (status === 400) {
          console.log(`⚠️  ${test.name}: 参数错误 - ${errorData?.msg || error.message}`);
          results.push({ ...test, status: 'bad_request', error: errorData?.msg || error.message });
        } else {
          console.log(`❌ ${test.name}: 其他错误 - ${error.message}`);
          results.push({ ...test, status: 'error', error: error.message });
        }
      }
      console.log('');
    }

    return results;
  }

  // 生成权限报告
  generateReport(results) {
    console.log('📋 权限检查报告');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.status === 'success');
    const permissionDenied = results.filter(r => r.status === 'permission_denied');
    const errors = results.filter(r => r.status !== 'success' && r.status !== 'permission_denied');

    console.log(`\n✅ 正常权限: ${successful.length}/${results.length}`);
    successful.forEach(result => {
      console.log(`   - ${result.name}: ${result.description}`);
    });

    if (permissionDenied.length > 0) {
      console.log(`\n❌ 缺少权限: ${permissionDenied.length}/${results.length}`);
      permissionDenied.forEach(result => {
        console.log(`   - ${result.name}: 需要申请 "${result.permission}"`);
      });
    }

    if (errors.length > 0) {
      console.log(`\n⚠️  其他问题: ${errors.length}/${results.length}`);
      errors.forEach(result => {
        console.log(`   - ${result.name}: ${result.error}`);
      });
    }

    // 权限申请建议
    console.log('\n📝 权限申请建议:');
    console.log('\n在飞书开放平台开发者后台申请以下权限:');
    
    const allPermissions = [
      { name: '以应用身份读取通讯录', code: 'contact:contact:readonly_as_app', required: true },
      { name: '获取用户基本信息', code: 'contact:user.base:readonly', required: true },
      { name: '获取部门基础信息', code: 'contact:department.base:readonly', required: true },
      { name: '获取用户组织架构信息', code: 'contact:user.department:readonly', required: false },
      { name: '获取用户邮箱信息', code: 'contact:user.email:readonly', required: false },
      { name: '获取用户手机号', code: 'contact:user.phone:readonly', required: false }
    ];

    console.log('\n🔴 必需权限:');
    allPermissions.filter(p => p.required).forEach(perm => {
      const hasPermission = successful.some(r => r.permission === perm.code);
      console.log(`   ${hasPermission ? '✅' : '❌'} ${perm.name} (${perm.code})`);
    });

    console.log('\n🟡 建议权限:');
    allPermissions.filter(p => !p.required).forEach(perm => {
      const hasPermission = successful.some(r => r.permission === perm.code);
      console.log(`   ${hasPermission ? '✅' : '❌'} ${perm.name} (${perm.code})`);
    });

    // 预期结果说明
    console.log('\n📈 预期同步结果:');
    const canGetUsers = successful.some(r => r.name === '用户列表API');
    const canGetDepartments = successful.some(r => r.name === '部门列表API');
    const canGetSubDepartments = successful.some(r => r.name === '子部门列表API');
    const canGetUsersByDept = successful.some(r => r.name === '按部门获取用户API');
    
    if (canGetUsers && canGetDepartments && canGetSubDepartments && canGetUsersByDept) {
      console.log('   🎯 完整同步: 可以获取完整的组织架构和用户信息');
      console.log('   📊 预期用户数: 24个（基于当前组织架构）');
    } else if (canGetUsers && canGetUsersByDept) {
      console.log('   ⚠️  基础同步: 可以获取根部门用户，但可能遗漏子部门用户');
      console.log('   📊 预期用户数: 4个（仅根部门）');
    } else if (canGetUsers) {
      console.log('   ⚠️  有限同步: 仅能获取有限的用户信息');
      console.log('   📊 预期用户数: 1个（当前用户）');
    } else {
      console.log('   ❌ 无法同步: 缺少基本的用户访问权限');
    }
  }

  // 主执行函数
  async run() {
    try {
      // 1. 获取访问令牌
      const tenantAccessToken = await this.getTenantAccessToken();
      
      // 2. 检查权限
      const results = await this.checkSpecificPermissions(tenantAccessToken);
      
      // 3. 生成报告
      this.generateReport(results);
      
      console.log('\n🔗 权限申请地址:');
      console.log('   https://open.feishu.cn/');
      console.log('   进入你的应用 → 权限管理 → API权限');
      
    } catch (error) {
      console.error('\n💥 权限检查失败:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const checker = new FeishuPermissionChecker();
  checker.run();
}

module.exports = FeishuPermissionChecker;