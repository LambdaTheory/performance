import { supabase, TABLES, SURVEY_STATUS } from '../lib/supabase';
import feishuAuth from './feishuAuth';

export class SurveyService {
  // 获取问卷模板
  static async getTemplate() {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_TEMPLATES)
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  // 获取员工信息
  static async getEmployees() {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }


  // 根据用户ID查找员工
  static async getEmployeeByUserId(userId) {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data;
  }

  // 创建员工记录
  static async createEmployee(employeeData) {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .insert([employeeData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 创建问卷回复
  static async createSurveyResponse(responseData) {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .insert([{
        ...responseData,
        status: SURVEY_STATUS.DRAFT,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 提交问卷
  static async submitSurveyResponse(id, responseData) {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .update({
        ...responseData,
        status: SURVEY_STATUS.SUBMITTED,
        submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 保存草稿
  static async saveDraft(id, responseData) {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .update({
        ...responseData,
        status: SURVEY_STATUS.DRAFT
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 获取问卷回复列表（管理员）
  static async getSurveyResponses(filters = {}) {
    let query = supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select(`
        *,
        employee:employee_id(name, department, position)
      `)
      .order('created_at', { ascending: false });

    // 应用过滤器
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.employeeName) {
      query = query.ilike('employee_name', `%${filters.employeeName}%`);
    }

    if (filters.department) {
      query = query.eq('employee.department', filters.department);
    }

    if (filters.dateFrom) {
      query = query.gte('submitted_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('submitted_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // 获取单个问卷回复
  static async getSurveyResponse(id) {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select(`
        *,
        employee:employee_id(name, department, position, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // 获取统计数据
  static async getStatistics() {
    // 总提交数
    const { count: totalCount } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select('*', { count: 'exact', head: true });

    // 已提交数
    const { count: submittedCount } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select('*', { count: 'exact', head: true })
      .eq('status', SURVEY_STATUS.SUBMITTED);

    // 草稿数
    const { count: draftCount } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select('*', { count: 'exact', head: true })
      .eq('status', SURVEY_STATUS.DRAFT);

    // 按部门统计
    const { data: departmentStats } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select(`
        employee_id,
        employee:employee_id(department)
      `)
      .eq('status', SURVEY_STATUS.SUBMITTED);

    // 处理部门统计
    const deptCounts = {};
    departmentStats?.forEach(item => {
      const dept = item.employee?.department || '未知';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    // 按日期统计最近7天
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: dateStats } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .select('submitted_at')
      .eq('status', SURVEY_STATUS.SUBMITTED)
      .gte('submitted_at', sevenDaysAgo.toISOString());

    // 处理日期统计
    const dateCounts = {};
    dateStats?.forEach(item => {
      if (item.submitted_at) {
        const date = new Date(item.submitted_at).toISOString().split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    return {
      total: totalCount || 0,
      submitted: submittedCount || 0,
      draft: draftCount || 0,
      reviewed: 0, // TODO: 实现审核功能后更新
      completion_rate: totalCount ? ((submittedCount || 0) / totalCount * 100).toFixed(1) : 0,
      by_department: Object.entries(deptCounts).map(([name, count]) => ({ name, count })),
      by_date: Object.entries(dateCounts).map(([date, count]) => ({ date, count }))
    };
  }

  // 审核问卷
  static async reviewSurveyResponse(id, reviewData) {
    const { data, error } = await supabase
      .from(TABLES.SURVEY_RESPONSES)
      .update({
        status: SURVEY_STATUS.REVIEWED,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewData.notes,
        reviewed_by: reviewData.reviewerId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 同步飞书成员到本地数据库
  static async syncMembersFromFeishu() {
    try {
      console.log('=== 开始同步飞书成员 ===');
      
      let feishuUsers = [];
      
      // 使用新的从部门获取用户的方法
      try {
        console.log('使用新的部门方法获取用户列表...');
        feishuUsers = await feishuAuth.getAllUsersFromDepartments();
        console.log(`从飞书API获取到 ${feishuUsers.length} 个用户`);
        
        if (feishuUsers.length === 0) {
          // 如果仍然没有数据，尝试原始API
          console.log('尝试原始API...');
          const fallbackResult = await feishuAuth.getAllContactUsers();
          feishuUsers = fallbackResult || [];
          console.log(`从原始API获取到 ${feishuUsers.length} 个用户`);
        }
      } catch (error) {
        console.error('所有API尝试都失败了:', error.message);
        throw new Error('无法从飞书获取用户列表，请检查API权限配置');
      }
      
      // 获取部门信息映射
      const departments = await feishuAuth.getAllDepartments();
      const departmentMap = {};
      
      if (departments && departments.length > 0) {
        departments.forEach(dept => {
          departmentMap[dept.department_id] = dept.name;
        });
      }

      const syncResults = {
        total: feishuUsers.length,
        created: 0,
        updated: 0,
        errors: 0,
        errorDetails: []
      };

      // 批量处理用户
      for (const feishuUser of feishuUsers) {
        try {
          // 新的数据结构
          const userData = {
            user_id: feishuUser.user_id,
            name: feishuUser.name,
            email: feishuUser.email || '',
            department: this.getDepartmentName(feishuUser.department_ids, departmentMap),
            position: feishuUser.job_title || '',
            updated_at: new Date().toISOString()
          };

          // 检查用户是否已存在
          const { data: existingUser } = await supabase
            .from(TABLES.EMPLOYEES)
            .select('id')
            .eq('user_id', userData.user_id)
            .single();

          if (existingUser) {
            // 更新现有用户
            const { error } = await supabase
              .from(TABLES.EMPLOYEES)
              .update(userData)
              .eq('user_id', userData.user_id);

            if (error) {
              syncResults.errors++;
              syncResults.errorDetails.push({
                user_id: userData.user_id,
                name: userData.name,
                error: error.message
              });
            } else {
              syncResults.updated++;
            }
          } else {
            // 创建新用户
            const { error } = await supabase
              .from(TABLES.EMPLOYEES)
              .insert([userData]);

            if (error) {
              syncResults.errors++;
              syncResults.errorDetails.push({
                user_id: userData.user_id,
                name: userData.name,
                error: error.message
              });
            } else {
              syncResults.created++;
            }
          }
        } catch (userError) {
          syncResults.errors++;
          syncResults.errorDetails.push({
            user_id: feishuUser.user_id || 'unknown',
            name: feishuUser.name || 'unknown',
            error: userError.message
          });
        }
      }

      return syncResults;
    } catch (error) {
      console.error('Sync members error:', error);
      throw error;
    }
  }

  // 辅助函数：获取部门名称
  static getDepartmentName(departmentIds, departmentMap) {
    if (!departmentIds || departmentIds.length === 0) {
      return '未分配部门';
    }
    
    // 取第一个部门作为主要部门
    const primaryDeptId = departmentIds[0];
    return departmentMap[primaryDeptId] || '未知部门';
  }

  // 获取同步历史记录（可选功能）
  static async getSyncHistory() {
    // 这里可以记录同步历史，暂时返回简单统计
    const { count: totalEmployees } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*', { count: 'exact', head: true });

    return {
      totalEmployees: totalEmployees || 0,
      lastSyncTime: new Date().toISOString()
    };
  }

  // 手动添加员工（临时解决方案）
  static async addEmployeeManually(employeeData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.EMPLOYEES)
        .insert([{
          user_id: employeeData.user_id,
          name: employeeData.name,
          department: employeeData.department || '待设置',
          position: employeeData.position || '待设置',
          email: employeeData.email || '',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Add employee manually error:', error);
      throw error;
    }
  }

  // 获取所有员工列表
  static async getAllEmployees() {
    try {
      const { data, error } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get all employees error:', error);
      throw error;
    }
  }
}