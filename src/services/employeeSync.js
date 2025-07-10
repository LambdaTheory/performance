/**
 * 员工同步服务
 * 负责从飞书同步员工数据到数据库
 */

import { FeishuAPI } from './feishuAPI';
import { supabase, TABLES } from '../lib/supabase';
import { initEmployeesTable } from '../utils/initDatabase';

export class EmployeeSyncService {
  constructor() {
    this.appId = process.env.REACT_APP_FEISHU_APP_ID;
    this.appSecret = process.env.REACT_APP_FEISHU_APP_SECRET;
    
    // 统计信息
    this.stats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      duplicateUsers: 0,
      newUsers: 0,
      updatedUsers: 0,
      errors: []
    };
    
    // 验证环境变量
    if (!this.appId || !this.appSecret) {
      throw new Error('缺少必要的环境变量: REACT_APP_FEISHU_APP_ID, REACT_APP_FEISHU_APP_SECRET');
    }
    
    this.api = new FeishuAPI(this.appId, this.appSecret);
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

  // 获取所有用户（主要方法）
  async getAllUsersFromFeishu() {
    try {
      const tenantAccessToken = await this.api.getTenantAccessToken();
      
      // 1. 获取根部门用户
      const rootUsers = await this.api.getAllUsersByDepartment('0', tenantAccessToken);
      let allUsers = [...rootUsers];
      
      // 2. 递归获取所有子部门
      const allDepartments = await this.getAllDepartmentsRecursive(tenantAccessToken);
      
      // 3. 获取每个子部门的用户
      for (const dept of allDepartments) {
        try {
          const deptUsers = await this.api.getAllUsersByDepartment(dept.department_id, tenantAccessToken);
          allUsers.push(...deptUsers);
          
          // 添加延迟避免频率限制
          await this.api.sleep(200);
        } catch (error) {
          this.stats.errors.push(`获取部门 ${dept.name} 用户失败: ${error.message}`);
        }
      }
      
      // 4. 处理和去重用户
      const processedUsers = this.processUsers(allUsers);
      
      return processedUsers;
    } catch (error) {
      this.stats.errors.push(`获取用户失败: ${error.message}`);
      throw error;
    }
  }

  // 处理用户数据（去重和格式化）
  processUsers(users) {
    const allUsers = new Map();
    
    for (const user of users) {
      this.stats.totalUsers++;
      
      // 过滤在职用户
      const isActive = !user.status?.is_resigned && !user.status?.is_frozen;
      
      if (isActive) {
        if (allUsers.has(user.user_id)) {
          this.stats.duplicateUsers++;
        } else {
          allUsers.set(user.user_id, {
            feishu_user_id: user.user_id,
            name: user.name,
            email: user.email || '',
            mobile: user.mobile || '',
            department_ids: user.department_ids || [],
            job_title: user.job_title || '',
            status: user.status,
            is_active: true,
            last_sync_time: new Date().toISOString()
          });
          this.stats.activeUsers++;
        }
      } else {
        this.stats.inactiveUsers++;
      }
    }
    
    return Array.from(allUsers.values());
  }

  // 同步用户到数据库
  async syncUsersToDatabase(users) {
    try {
      // 检查employees表是否存在，如果不存在则创建
      await this.ensureEmployeesTableExists();
      
      // 获取现有员工数据
      const { data: existingEmployees, error: fetchError } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('*');
      
      if (fetchError) {
        throw new Error(`获取现有员工数据失败: ${fetchError.message}`);
      }
      
      const existingEmployeesMap = new Map();
      existingEmployees?.forEach(emp => {
        existingEmployeesMap.set(emp.feishu_user_id, emp);
      });
      
      const usersToInsert = [];
      const usersToUpdate = [];
      
      // 分类新增和更新的用户
      for (const user of users) {
        const existing = existingEmployeesMap.get(user.feishu_user_id);
        
        if (existing) {
          // 检查是否需要更新
          if (this.needsUpdate(existing, user)) {
            usersToUpdate.push({
              ...user,
              id: existing.id // 保留现有ID
            });
            this.stats.updatedUsers++;
          }
        } else {
          usersToInsert.push(user);
          this.stats.newUsers++;
        }
      }
      
      // 批量插入新用户
      if (usersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from(TABLES.EMPLOYEES)
          .insert(usersToInsert);
        
        if (insertError) {
          throw new Error(`插入新员工失败: ${insertError.message}`);
        }
      }
      
      // 批量更新现有用户
      for (const user of usersToUpdate) {
        const { error: updateError } = await supabase
          .from(TABLES.EMPLOYEES)
          .update(user)
          .eq('id', user.id);
        
        if (updateError) {
          this.stats.errors.push(`更新员工 ${user.name} 失败: ${updateError.message}`);
        }
      }
      
      // 标记不活跃用户
      await this.markInactiveUsers(users, existingEmployees);
      
      return {
        success: true,
        stats: this.stats
      };
      
    } catch (error) {
      this.stats.errors.push(`数据库同步失败: ${error.message}`);
      throw error;
    }
  }

  // 检查用户是否需要更新
  needsUpdate(existing, newUser) {
    return (
      existing.name !== newUser.name ||
      existing.email !== newUser.email ||
      existing.mobile !== newUser.mobile ||
      existing.job_title !== newUser.job_title ||
      JSON.stringify(existing.department_ids) !== JSON.stringify(newUser.department_ids)
    );
  }

  // 标记不活跃用户
  async markInactiveUsers(activeUsers, allExistingUsers) {
    const activeUserIds = new Set(activeUsers.map(user => user.feishu_user_id));
    const inactiveUsers = allExistingUsers?.filter(emp => 
      emp.feishu_user_id && !activeUserIds.has(emp.feishu_user_id) && emp.is_active
    ) || [];
    
    for (const user of inactiveUsers) {
      const { error } = await supabase
        .from(TABLES.EMPLOYEES)
        .update({ 
          is_active: false, 
          last_sync_time: new Date().toISOString() 
        })
        .eq('id', user.id);
      
      if (error) {
        this.stats.errors.push(`标记用户 ${user.name} 为不活跃失败: ${error.message}`);
      }
    }
  }

  // 确保employees表存在
  async ensureEmployeesTableExists() {
    try {
      const result = await initEmployeesTable();
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      throw new Error(`初始化员工表失败: ${error.message}`);
    }
  }

  // 主同步方法
  async syncEmployees() {
    try {
      // 重置统计信息
      this.stats = {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        duplicateUsers: 0,
        newUsers: 0,
        updatedUsers: 0,
        errors: []
      };
      
      // 1. 从飞书获取用户数据
      const users = await this.getAllUsersFromFeishu();
      
      // 2. 同步到数据库
      const result = await this.syncUsersToDatabase(users);
      
      return {
        success: true,
        message: '员工数据同步完成',
        stats: this.stats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        message: `员工数据同步失败: ${error.message}`,
        stats: this.stats,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 获取同步统计信息
  getSyncStats() {
    return { ...this.stats };
  }

  // 获取所有部门及其用户统计信息（用于管理界面）
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
}

export default EmployeeSyncService;