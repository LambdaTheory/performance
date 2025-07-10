import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'performance-survey-system'
    }
  }
});

// 数据库表名常量
export const TABLES = {
  EMPLOYEES: 'pt_employees',
  SURVEY_TEMPLATES: 'pt_survey_templates',
  SURVEY_RESPONSES: 'pt_survey_responses',
  USERS: 'pt_users'
};

// 数据状态常量
export const SURVEY_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted', 
  REVIEWED: 'reviewed'
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MANAGER: 'manager'
};