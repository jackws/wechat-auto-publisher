const express = require('express');
const router = express.Router();
const { runPipeline } = require('../services/pipeline');
const { schedule, stopScheduler, isActive } = require('../services/scheduler');
const configManager = require('../services/config-manager');
const { workflowStore } = require('../db/database');

// GET /api/workflow/status
router.get('/status', (req, res) => {
  try {
    const configured = configManager.isConfigured();
    res.json({
      success: true,
      data: {
        configured,
        active: isActive(),
        last_execution_at: workflowStore.get('last_execution_at', ''),
        last_execution_status: workflowStore.get('last_execution_status', ''),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflow/activate
router.post('/activate', (req, res) => {
  try {
    const cronExpr = configManager.getRawConfig('schedule.cron') || '0 20 * * *';
    const ok = schedule(cronExpr);
    if (ok) {
      res.json({ success: true, message: '定时任务已激活' });
    } else {
      res.status(400).json({ success: false, error: '无效的 Cron 表达式' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflow/deactivate
router.post('/deactivate', (req, res) => {
  try {
    stopScheduler();
    res.json({ success: true, message: '定时任务已停用' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflow/trigger - Manual trigger
router.post('/trigger', async (req, res) => {
  try {
    if (!configManager.isConfigured()) {
      return res.status(400).json({ success: false, error: '请先完成配置（AI Key、微信 AppID/Secret）' });
    }
    // Run in background
    runPipeline().catch(err => {
      console.error('手动触发失败:', err.message);
    });
    res.json({ success: true, message: '已触发文章生成，请稍后查看历史记录' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
