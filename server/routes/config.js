const express = require('express');
const router = express.Router();
const configManager = require('../services/config-manager');
const scheduler = require('../services/scheduler');

// GET /api/config - Get all config (secrets masked)
router.get('/', (req, res) => {
  try {
    const config = configManager.getAllConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/config/:category - Get config by category
router.get('/:category', (req, res) => {
  try {
    const config = configManager.getConfig(req.params.category);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/config - Update config
router.put('/', (req, res) => {
  try {
    const { updates, _v } = req.body;

    // 只接受新版本代码的请求，拒绝旧代码的自动保存
    if (_v !== 2) {
      return res.json({ success: true, message: 'ignored (old version)' });
    }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates must be an array of {key, value}' });
    }

    // Filter out masked values
    const filtered = updates.filter(u => {
      if (!u.key || u.value === undefined) return false;
      if (typeof u.value === 'string' && u.value.startsWith('****')) return false;
      return true;
    });

    // 保护 AI 关键配置：防止被旧代码/错误值覆盖
    const KNOWN_BAD_KEYS = ['tp-cecaf0ki9awhkdno2oxp731pa2uai3hclewqfjk5waaqb6s6'];
    const protectedKeys = ['ai.provider_url', 'ai.api_key', 'ai.model'];
    const safeFiltered = filtered.filter(u => {
      if (!protectedKeys.includes(u.key)) return true;
      const current = configManager.getRawConfig(u.key);
      if (!current) return true;
      if (!u.value || u.value.trim() === '') return false;
      if (u.key === 'ai.provider_url' && !u.value.includes('/v1/')) return false;
      if (u.key === 'ai.api_key' && KNOWN_BAD_KEYS.includes(u.value)) return false;
      return true;
    });

    configManager.updateConfig(safeFiltered);

    // 如果定时任务配置变更，自动重启调度器
    const cronUpdated = filtered.some(u => u.key === 'schedule.cron');
    if (cronUpdated && scheduler.isActive()) {
      const newCron = configManager.getRawConfig('schedule.cron');
      scheduler.schedule(newCron);
    }

    res.json({ success: true, message: '配置已更新' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/config/test-ai - Test AI connection
router.post('/test-ai', async (req, res) => {
  try {
    const url = configManager.getRawConfig('ai.provider_url');
    const apiKey = configManager.getRawConfig('ai.api_key');
    const model = configManager.getRawConfig('ai.model');

    if (!url || !apiKey) {
      return res.status(400).json({ success: false, error: '请先配置 AI API 地址和密钥' });
    }

    const isAnthropic = url.includes('anthropic');
    const headers = { 'Content-Type': 'application/json' };
    const body = isAnthropic
      ? { model, max_tokens: 50, messages: [{ role: 'user', content: '你好，请回复"连接成功"' }] }
      : { model, max_tokens: 50, messages: [{ role: 'user', content: '你好，请回复"连接成功"' }] };

    if (isAnthropic) {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Anthropic 格式: { content: [{ type: "text", text: "..." }] }
    if (data.content && data.content[0]) {
      const text = data.content.map(c => c.text || '').join('');
      return res.json({ success: true, message: 'AI 连接测试成功', response: text });
    }

    // OpenAI 格式: { choices: [{ message: { content: "..." } }] }
    if (data.choices && data.choices[0]) {
      return res.json({ success: true, message: 'AI 连接测试成功', response: data.choices[0].message.content });
    } else {
      res.json({ success: false, error: 'AI 响应格式异常', detail: data });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'AI 连接失败: ' + err.message });
  }
});

// POST /api/config/test-wechat - Test WeChat credentials
router.post('/test-wechat', async (req, res) => {
  try {
    const appId = configManager.getRawConfig('wechat.app_id');
    const appSecret = configManager.getRawConfig('wechat.app_secret');

    if (!appId || !appSecret) {
      return res.status(400).json({ success: false, error: '请先配置微信 AppID 和 AppSecret' });
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.access_token) {
      res.json({ success: true, message: '微信凭证验证成功' });
    } else {
      res.json({ success: false, error: `微信验证失败: ${data.errmsg || '未知错误'}`, code: data.errcode });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: '微信连接失败: ' + err.message });
  }
});

// POST /api/config/test-pexels - Test Pexels API
router.post('/test-pexels', async (req, res) => {
  try {
    const apiKey = configManager.getRawConfig('image.pexels_key');
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请先配置 Pexels API Key' });
    }

    const response = await fetch('https://api.pexels.com/v1/search?query=nature&per_page=1', {
      headers: { 'Authorization': apiKey },
    });
    const data = await response.json();

    if (data.photos && data.photos.length > 0) {
      res.json({ success: true, message: 'Pexels 连接成功' });
    } else {
      res.json({ success: false, error: 'Pexels 响应异常' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Pexels 连接失败: ' + err.message });
  }
});

// POST /api/config/test-bing - Test Bing Image Search API
router.post('/test-bing', async (req, res) => {
  try {
    const apiKey = configManager.getRawConfig('image.bing_key');
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请先配置 Bing API Key' });
    }

    const response = await fetch('https://api.bing.microsoft.com/v7.0/images/search?q=nature&count=1', {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    const data = await response.json();

    if (data.value && data.value.length > 0) {
      res.json({ success: true, message: 'Bing 图片搜索连接成功' });
    } else {
      res.json({ success: false, error: 'Bing 响应异常' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Bing 连接失败: ' + err.message });
  }
});

module.exports = router;
