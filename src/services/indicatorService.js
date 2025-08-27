import { supabase, TABLES } from '../lib/supabase';

export class IndicatorService {
  // 获取所有指标
  static async getAllIndicators() {
    const { data, error } = await supabase
      .from(TABLES.INDICATORS)
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data;
  }

  // 创建新指标
  static async createIndicator(indicatorData) {
    const { data, error } = await supabase
      .from(TABLES.INDICATORS)
      .insert([indicatorData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 更新指标
  static async updateIndicator(id, indicatorData) {
    const { data, error } = await supabase
      .from(TABLES.INDICATORS)
      .update(indicatorData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 删除指标
  static async deleteIndicator(id) {
    const { data, error } = await supabase
      .from(TABLES.INDICATORS)
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}