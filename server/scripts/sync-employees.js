#!/usr/bin/env node

/**
 * 独立的员工同步脚本
 * 可以通过命令行直接执行同步任务
 */

require('dotenv').config();

const EmployeeSyncService = require('../services/employeeSync');
const logger = require('../utils/logger');

async function runSync() {
  try {
    console.log('🚀 开始员工数据同步...\n');
    
    const syncService = new EmployeeSyncService();
    const result = await syncService.syncEmployees();
    
    if (result.success) {
      console.log('✅ 同步成功！\n');
      console.log('📊 同步统计:');
      console.log(`   👥 总用户数: ${result.stats.totalUsers}`);
      console.log(`   ✅ 在职用户: ${result.stats.activeUsers}`);
      console.log(`   ❌ 离职用户: ${result.stats.inactiveUsers}`);
      console.log(`   🆕 新增用户: ${result.stats.newUsers}`);
      console.log(`   🔄 更新用户: ${result.stats.updatedUsers}`);
      console.log(`   📉 停用用户: ${result.stats.deactivatedUsers}`);
      console.log(`   🔄 重复用户: ${result.stats.duplicateUsers}`);
      console.log(`   ⚠️  错误数量: ${result.stats.errors.length}`);
      console.log(`   ⏱️  耗时: ${result.duration}ms`);
      
      if (result.stats.errors.length > 0) {
        console.log('\n❌ 错误详情:');
        result.stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    } else {
      console.log('❌ 同步失败:', result.message);
      if (result.stats.errors.length > 0) {
        console.log('\n错误详情:');
        result.stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      process.exit(1);
    }
    
    console.log('\n🎉 同步任务完成！');
    
  } catch (error) {
    console.error('💥 同步任务失败:', error.message);
    logger.error('同步脚本执行失败:', error);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔄 员工数据同步脚本

用法:
  node scripts/sync-employees.js [选项]

选项:
  -h, --help     显示帮助信息
  --dry-run      模拟运行（暂未实现）
  --verbose      详细输出

示例:
  node scripts/sync-employees.js
  npm run sync:employees

环境变量:
  FEISHU_APP_ID       飞书应用ID
  FEISHU_APP_SECRET   飞书应用密钥
  SUPABASE_URL        Supabase项目URL
  SUPABASE_SERVICE_KEY Supabase服务密钥

注意:
  - 确保已配置所需的环境变量
  - 同步过程可能需要几秒钟时间
  - 脚本会自动创建数据库表（如果不存在）
`);
  process.exit(0);
}

// 设置详细模式
if (args.includes('--verbose')) {
  process.env.LOG_LEVEL = 'debug';
}

// 执行同步
runSync();