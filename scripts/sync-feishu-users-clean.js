#!/usr/bin/env node

/**
 * 飞书用户同步脚本 - 简化版
 * 
 * 功能：
 * 1. 从飞书获取用户列表
 * 2. 过滤在职用户并去重
 * 3. 输出结构化数据
 */

require('dotenv').config();

const FeishuAPI = require('./feishu-api');

class FeishuUserSync {
  constructor() {
    this.appId = process.env.REACT_APP_FEISHU_APP_ID;
    this.appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    
    // 统计信息
    this.stats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      duplicateUsers: 0,
      errors: []
    };
    
    // 验证环境变量
    if (!this.appId || !this.appSecret) {
      console.error('❌ 缺少必要的环境变量:');
      console.error('   REACT_APP_FEISHU_APP_ID');
      console.error('   REACT_APP_FEISHU_APP_SECRET');
      process.exit(1);
    }
    
    this.api = new FeishuAPI(this.appId, this.appSecret);
    console.log('🚀 飞书用户同步脚本启动...');
  }

  // 获取所有用户（主要方法）
  async getAllUsers() {
    try {
      const tenantAccessToken = await this.api.getTenantAccessToken();
      console.log('✅ 访问令牌获取成功');
      
      console.log('📂 开始获取所有部门和用户...');
      
      // 1. 获取根部门用户
      console.log('📂 获取根部门用户 (department_id=0)...');
      const rootUsers = await this.api.getAllUsersByDepartment('0', tenantAccessToken);
      console.log(`   📊 根部门: ${rootUsers.length} 个用户`);
      
      let allUsers = [...rootUsers];
      
      // 2. 递归获取所有子部门
      console.log('📂 递归获取所有子部门...');
      const allDepartments = await this.getAllDepartmentsRecursive(tenantAccessToken);
      console.log(`   📊 总共发现 ${allDepartments.length} 个部门`);
      
      // 3. 获取每个子部门的用户
      for (const dept of allDepartments) {
        try {
          console.log(`📂 获取部门 "${dept.name}" 的用户...`);
          const deptUsers = await this.api.getAllUsersByDepartment(dept.department_id, tenantAccessToken);
          console.log(`   📊 部门 "${dept.name}": ${deptUsers.length} 个用户`);
          allUsers.push(...deptUsers);
          
          // 添加延迟避免频率限制
          await this.api.sleep(200);
        } catch (error) {
          console.log(`   ❌ 获取部门 "${dept.name}" 用户失败: ${error.message}`);
          this.stats.errors.push(`获取部门 ${dept.name} 用户失败: ${error.message}`);
        }
      }
      
      console.log(`📊 总共获取到 ${allUsers.length} 个用户记录（包含重复）`);
      
      // 4. 处理和去重用户
      const processedUsers = this.processUsers(allUsers);
      
      return processedUsers;
    } catch (error) {
      console.error('❌ 获取用户失败:', error.message);
      this.stats.errors.push(`获取用户失败: ${error.message}`);
      throw error;
    }
  }

  // 递归获取所有部门（包括子部门）
  async getAllDepartmentsRecursive(tenantAccessToken, departmentId = '0', allDepartments = []) {
    try {
      // 获取当前部门的子部门
      const children = await this.api.getDepartmentChildren(departmentId, tenantAccessToken);
      
      if (children.length === 0) {
        return allDepartments;
      }
      
      // 添加子部门到列表并递归获取子部门
      for (const child of children) {
        allDepartments.push(child);
        
        // 递归检查这个子部门是否还有子部门
        await this.getAllDepartmentsRecursive(tenantAccessToken, child.department_id, allDepartments);
        
        // 添加延迟避免频率限制
        await this.api.sleep(100);
      }
      
      return allDepartments;
    } catch (error) {
      // 静默处理错误，继续处理其他部门
      return allDepartments;
    }
  }

  // 获取所有部门及其用户统计信息
  async getAllDepartmentsWithUsers() {
    try {
      const tenantAccessToken = await this.api.getTenantAccessToken();
      
      // 1. 获取根部门信息
      const rootDepartments = await this.api.getDepartments(tenantAccessToken);
      
      // 2. 递归获取所有子部门
      const allDepartments = await this.getAllDepartmentsRecursive(tenantAccessToken);
      
      // 3. 获取每个部门的用户数量
      const departmentUserCounts = {};
      
      // 获取根部门用户数量
      try {
        const rootUsers = await this.api.getAllUsersByDepartment('0', tenantAccessToken);
        departmentUserCounts['0'] = {
          name: '根部门',
          userCount: rootUsers.length,
          users: rootUsers
        };
      } catch (error) {
        departmentUserCounts['0'] = { name: '根部门', userCount: 0, users: [], error: error.message };
      }
      
      // 获取所有子部门的用户数量
      for (const dept of allDepartments) {
        try {
          const deptUsers = await this.api.getAllUsersByDepartment(dept.department_id, tenantAccessToken);
          departmentUserCounts[dept.department_id] = {
            name: dept.name || '未命名部门',
            userCount: deptUsers.length,
            users: deptUsers,
            department: dept
          };
        } catch (error) {
          departmentUserCounts[dept.department_id] = {
            name: dept.name || '未命名部门',
            userCount: 0,
            users: [],
            department: dept,
            error: error.message
          };
        }
        
        // 添加延迟避免频率限制
        await this.api.sleep(200);
      }
      
      return {
        rootDepartments,
        allDepartments,
        departmentUserCounts,
        totalDepartments: allDepartments.length + 1, // +1 for root
        totalUsers: Object.values(departmentUserCounts).reduce((sum, dept) => sum + dept.userCount, 0)
      };
    } catch (error) {
      throw new Error(`获取部门和用户信息失败: ${error.message}`);
    }
  }

  // 处理用户数据
  processUsers(users) {
    const allUsers = new Map();
    
    for (const user of users) {
      this.stats.totalUsers++;
      
      // 过滤在职用户
      const isActive = !user.status?.is_resigned && !user.status?.is_frozen;
      
      if (isActive) {
        if (allUsers.has(user.user_id)) {
          this.stats.duplicateUsers++;
          console.log(`🔄 重复用户: ${user.name}`);
        } else {
          allUsers.set(user.user_id, {
            user_id: user.user_id,
            name: user.name,
            email: user.email || '',
            mobile: user.mobile || '',
            department_ids: user.department_ids || [],
            job_title: user.job_title || '',
            status: user.status,
            sync_time: new Date().toISOString()
          });
          this.stats.activeUsers++;
          console.log(`✅ 在职用户: ${user.name}`);
        }
      } else {
        this.stats.inactiveUsers++;
        console.log(`❌ 离职用户: ${user.name}`);
      }
    }
    
    return Array.from(allUsers.values());
  }

}

module.exports = FeishuUserSync;