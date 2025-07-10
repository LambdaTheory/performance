/**
 * 员工同步服务 - 后端版本
 * 负责从飞书同步员工数据到数据库
 */

const FeishuAPI = require('./feishuAPI');
const { supabase } = require('../utils/database');
const logger = require('../utils/logger');

const TABLES = {
  EMPLOYEES: 'pt_employees'
};

class EmployeeSyncService {
  constructor() {
    this.api = new FeishuAPI();
    
    // 统计信息
    this.stats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      duplicateUsers: 0,
      newUsers: 0,
      updatedUsers: 0,
      deactivatedUsers: 0,
      errors: []
    };
  }

  // 重置统计信息
  resetStats() {
    this.stats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      duplicateUsers: 0,
      newUsers: 0,
      updatedUsers: 0,
      deactivatedUsers: 0,
      errors: []
    };
  }

  // 递归获取所有部门（包括子部门）
  async getAllDepartmentsRecursive(tenantAccessToken, departmentId = '0', allDepartments = []) {
    try {
      logger.debug(`获取部门 ${departmentId} 的子部门`);
      
      // 获取当前部门的子部门
      const children = await this.api.getDepartmentChildren(departmentId, tenantAccessToken);
      
      if (children.length === 0) {
        return allDepartments;
      }
      
      // 添加子部门到列表并递归获取子部门
      for (const child of children) {
        allDepartments.push(child);
        logger.debug(`发现部门: ${child.name} (ID: ${child.department_id})`);
        
        // 递归检查这个子部门是否还有子部门
        await this.getAllDepartmentsRecursive(tenantAccessToken, child.department_id, allDepartments);
        
        // 添加延迟避免频率限制
        await this.api.sleep(100);
      }
      
      return allDepartments;
    } catch (error) {
      logger.warn(`获取部门 ${departmentId} 的子部门失败: ${error.message}`);
      // 静默处理错误，继续处理其他部门
      return allDepartments;
    }
  }

  // 获取所有用户（主要方法）
  async getAllUsersFromFeishu() {
    try {
      const tenantAccessToken = await this.api.getTenantAccessToken();
      logger.info('开始从飞书获取用户数据');
      
      // 1. 获取根部门用户
      logger.debug('获取根部门用户');
      const rootUsers = await this.api.getAllUsersByDepartment('0', tenantAccessToken);
      logger.info(`根部门获取到 ${rootUsers.length} 个用户`);
      
      let allUsers = [...rootUsers];
      
      // 2. 递归获取所有子部门
      logger.debug('获取所有子部门');
      const allDepartments = await this.getAllDepartmentsRecursive(tenantAccessToken);
      logger.info(`发现 ${allDepartments.length} 个子部门`);
      
      // 3. 获取每个子部门的用户
      for (const dept of allDepartments) {
        try {
          logger.debug(`获取部门 "${dept.name}" 的用户`);
          const deptUsers = await this.api.getAllUsersByDepartment(dept.department_id, tenantAccessToken);
          logger.debug(`部门 "${dept.name}" 获取到 ${deptUsers.length} 个用户`);
          allUsers.push(...deptUsers);
          
          // 添加延迟避免频率限制
          await this.api.sleep(200);
        } catch (error) {
          const errorMsg = `获取部门 ${dept.name} 用户失败: ${error.message}`;
          logger.error(errorMsg);
          this.stats.errors.push(errorMsg);
        }
      }
      
      logger.info(`总共获取到 ${allUsers.length} 个用户记录（包含重复）`);
      
      // 4. 处理和去重用户
      const processedUsers = this.processUsers(allUsers);
      logger.info(`处理后得到 ${processedUsers.length} 个有效用户`);
      
      return processedUsers;
    } catch (error) {
      const errorMsg = `从飞书获取用户失败: ${error.message}`;
      logger.error(errorMsg);
      this.stats.errors.push(errorMsg);
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
          logger.debug(`发现重复用户: ${user.name}`);
        } else {
          allUsers.set(user.user_id, {
            user_id: user.user_id,
            name: user.name,
            email: user.email || '',
            department: '', // 暂时留空，根据需要可以添加部门信息
            position: user.job_title || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          this.stats.activeUsers++;
          logger.debug(`处理在职用户: ${user.name}`);
        }
      } else {
        this.stats.inactiveUsers++;
        logger.debug(`跳过离职用户: ${user.name}`);
      }
    }
    
    return Array.from(allUsers.values());
  }

  // 同步用户到数据库
  async syncUsersToDatabase(users) {
    try {
      logger.info('开始同步用户到数据库');
      
      // 获取现有员工数据
      const { data: existingEmployees, error: fetchError } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('*');
      
      if (fetchError) {
        throw new Error(`获取现有员工数据失败: ${fetchError.message}`);
      }
      
      const existingEmployeesMap = new Map();
      existingEmployees?.forEach(emp => {
        existingEmployeesMap.set(emp.user_id, emp);
      });
      
      const usersToInsert = [];
      const usersToUpdate = [];
      
      // 分类新增和更新的用户
      for (const user of users) {
        const existing = existingEmployeesMap.get(user.user_id);
        
        if (existing) {
          // 检查是否需要更新
          if (this.needsUpdate(existing, user)) {
            usersToUpdate.push({
              ...user,
              id: existing.id // 保留现有ID
            });
            this.stats.updatedUsers++;
            logger.debug(`标记更新用户: ${user.name}`);
          }
        } else {
          usersToInsert.push(user);
          this.stats.newUsers++;
          logger.debug(`标记新增用户: ${user.name}`);
        }
      }
      
      // 批量插入新用户
      if (usersToInsert.length > 0) {
        logger.info(`插入 ${usersToInsert.length} 个新用户`);
        const { error: insertError } = await supabase
          .from(TABLES.EMPLOYEES)
          .insert(usersToInsert);
        
        if (insertError) {
          throw new Error(`插入新员工失败: ${insertError.message}`);
        }
      }
      
      // 批量更新现有用户
      if (usersToUpdate.length > 0) {
        logger.info(`更新 ${usersToUpdate.length} 个现有用户`);
        for (const user of usersToUpdate) {
          const { error: updateError } = await supabase
            .from(TABLES.EMPLOYEES)
            .update(user)
            .eq('id', user.id);
          
          if (updateError) {
            const errorMsg = `更新员工 ${user.name} 失败: ${updateError.message}`;
            logger.error(errorMsg);
            this.stats.errors.push(errorMsg);
          }
        }
      }
      
      // 标记不活跃用户
      await this.markInactiveUsers(users, existingEmployees);
      
      logger.info('数据库同步完成');
      return {
        success: true,
        stats: this.stats
      };
      
    } catch (error) {
      const errorMsg = `数据库同步失败: ${error.message}`;
      logger.error(errorMsg);
      this.stats.errors.push(errorMsg);
      throw error;
    }
  }

  // 检查用户是否需要更新
  needsUpdate(existing, newUser) {
    return (
      existing.name !== newUser.name ||
      existing.email !== newUser.email ||
      existing.department !== newUser.department ||
      existing.position !== newUser.position
    );
  }

  // 标记不活跃用户
  async markInactiveUsers(activeUsers, allExistingUsers) {
    const activeUserIds = new Set(activeUsers.map(user => user.user_id));
    const inactiveUsers = allExistingUsers?.filter(emp => 
      emp.user_id && !activeUserIds.has(emp.user_id)
    ) || [];
    
    if (inactiveUsers.length > 0) {
      logger.info(`标记 ${inactiveUsers.length} 个用户为不活跃`);
      
      // 注意：当前数据库表没有 is_active 字段，暂时跳过标记不活跃用户的功能
      // for (const user of inactiveUsers) {
      //   const { error } = await supabase
      //     .from(TABLES.EMPLOYEES)
      //     .update({ 
      //       updated_at: new Date().toISOString() 
      //     })
      //     .eq('id', user.id);
        
        // if (error) {
        //   const errorMsg = `标记用户 ${user.name} 为不活跃失败: ${error.message}`;
        //   logger.error(errorMsg);
        //   this.stats.errors.push(errorMsg);
        // } else {
        //   this.stats.deactivatedUsers++;
        //   logger.debug(`标记用户 ${user.name} 为不活跃`);
        // }
      // }
    }
  }

  // 主同步方法
  async syncEmployees() {
    try {
      const startTime = Date.now();
      logger.info('开始员工同步任务');
      
      // 重置统计信息
      this.resetStats();
      
      // 1. 从飞书获取用户数据
      const users = await this.getAllUsersFromFeishu();
      
      // 2. 同步到数据库
      await this.syncUsersToDatabase(users);
      
      const duration = Date.now() - startTime;
      logger.info(`员工同步完成，耗时 ${duration}ms`);
      
      return {
        success: true,
        message: '员工数据同步完成',
        stats: this.stats,
        duration: duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('员工同步失败:', error);
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

  // 验证飞书API权限
  async validateFeishuPermissions() {
    try {
      const tenantAccessToken = await this.api.getTenantAccessToken();
      const results = await this.api.validatePermissions(tenantAccessToken);
      
      return {
        success: true,
        permissions: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('权限验证失败:', error);
      return {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = EmployeeSyncService;