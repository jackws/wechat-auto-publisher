const { configStore } = require('../db/database');

const DEFAULTS = {
  'ai.provider_url': 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
  'ai.api_key': '',
  'ai.model': 'mimo-v2.5-pro',
  'ai.max_tokens': '3000',
  'wechat.app_id': '',
  'wechat.app_secret': '',
  'image.sources': 'pexels,cogview',
  'image.pexels_key': '',
  'image.bing_key': '',
  'image.cogview_key': '',
  'image.tongyi_key': '',
  'image.ai_endpoint': '',
  'image.ai_count': '2',
  'image.query_prefix': '',
  'schedule.cron': '0 20 * * *',
  'prompt.system': '',
  'prompt.user': '',
};

const ENV_MAPPING = {
  'AI_PROVIDER_URL': 'ai.provider_url',
  'AI_API_KEY': 'ai.api_key',
  'AI_MODEL': 'ai.model',
  'AI_MAX_TOKENS': 'ai.max_tokens',
  'WECHAT_APP_ID': 'wechat.app_id',
  'WECHAT_APP_SECRET': 'wechat.app_secret',
  'PEXELS_API_KEY': 'image.pexels_key',
  'BING_KEY': 'image.bing_key',
  'COGVIEW_KEY': 'image.cogview_key',
  'TONGYI_KEY': 'image.tongyi_key',
  'IMAGE_SOURCES': 'image.sources',
  'IMAGE_AI_COUNT': 'image.ai_count',
};

const SECRET_KEYS = ['ai.api_key', 'wechat.app_secret', 'image.pexels_key', 'image.bing_key', 'image.cogview_key', 'image.tongyi_key'];
const CATEGORIES = {
  'ai': ['ai.provider_url', 'ai.api_key', 'ai.model', 'ai.max_tokens'],
  'wechat': ['wechat.app_id', 'wechat.app_secret'],
  'image': ['image.sources', 'image.pexels_key', 'image.bing_key', 'image.cogview_key', 'image.tongyi_key', 'image.ai_endpoint', 'image.ai_count', 'image.query_prefix'],
  'schedule': ['schedule.cron'],
  'prompt': ['prompt.system', 'prompt.user'],
};

function seedFromEnv() {
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    if (configStore.get(key) !== undefined) continue;

    // Check env var first
    const envKey = Object.entries(ENV_MAPPING).find(([, k]) => k === key);
    const value = (envKey && process.env[envKey[0]]) || defaultValue;
    configStore.set(key, value);
  }
}

function getAllConfig() {
  const config = {};
  for (const [category, keys] of Object.entries(CATEGORIES)) {
    config[category] = {};
    for (const key of keys) {
      const value = configStore.get(key, '');
      if (SECRET_KEYS.includes(key) && value) {
        config[category][key] = '****' + value.slice(-4);
      } else {
        config[category][key] = value;
      }
    }
  }
  return config;
}

function getConfig(category) {
  const keys = CATEGORIES[category] || [];
  const config = {};
  for (const key of keys) {
    const value = configStore.get(key, '');
    if (SECRET_KEYS.includes(key) && value) {
      config[key] = '****' + value.slice(-4);
    } else {
      config[key] = value;
    }
  }
  return config;
}

function getRawConfig(key) {
  return configStore.get(key, '');
}

function getAllRawConfig() {
  return configStore.getAll();
}

function updateConfig(updates) {
  for (const { key, value } of updates) {
    configStore.set(key, value);
  }
}

function isConfigured() {
  const essential = ['ai.api_key', 'wechat.app_id', 'wechat.app_secret'];
  return essential.every(key => configStore.get(key, ''));
}

module.exports = {
  seedFromEnv,
  getAllConfig,
  getConfig,
  getRawConfig,
  getAllRawConfig,
  updateConfig,
  isConfigured,
  SECRET_KEYS,
  CATEGORIES,
};
