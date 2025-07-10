import { supabase, TABLES, SURVEY_STATUS } from '../lib/supabase';

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
}