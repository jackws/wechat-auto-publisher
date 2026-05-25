const cron = require('node-cron');
const configManager = require('./config-manager');
const { runPipeline } = require('./pipeline');
const { workflowStore } = require('../db/database');

let currentTask = null;

function startScheduler() {
  const cronExpr = configManager.getRawConfig('schedule.cron') || '0 20 * * *';
  const active = workflowStore.get('active', false);

  if (active) {
    schedule(cronExpr);
  }
}

function schedule(cronExpr) {
  stopScheduler();

  if (!cron.validate(cronExpr)) {
    console.error(`无效的 Cron 表达式: ${cronExpr}`);
    return false;
  }

  currentTask = cron.schedule(cronExpr, async () => {
    console.log(`[${new Date().toISOString()}] 定时任务触发，开始生成文章...`);
    try {
      const result = await runPipeline();
      console.log(`[${new Date().toISOString()}] 文章生成成功: ${result.title}`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] 文章生成失败:`, err.message);
    }
  }, { timezone: 'Asia/Shanghai' });

  workflowStore.set('active', true);
  console.log(`定时任务已启动: ${cronExpr}`);
  return true;
}

function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  workflowStore.set('active', false);
}

function isActive() {
  return currentTask !== null;
}

module.exports = { startScheduler, schedule, stopScheduler, isActive };
