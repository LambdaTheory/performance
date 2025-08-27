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
      'X-Client-Info': 'performance-evaluation-system'
    }
  }
});

// 数据库表名常量
export const TABLES = {
  EMPLOYEES: 'pt_employees',
  USERS: 'pt_users',
  INDICATORS: 'PT_indicators',
  EVALUATION_TEMPLATES: 'PT_evaluation_templates',
  EVALUATIONS: 'PT_evaluations'
};

export const USER_ROLES = {
  ADMIN: 'admin'
  // 删除 USER: 'user'
};