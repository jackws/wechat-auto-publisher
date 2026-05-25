// Global toast
function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}

// Global help panel trigger
function openHelpPanel(topicId) {
  window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId } }));
}

function closeHelpPanel() {
  window.dispatchEvent(new CustomEvent('close-help'));
}

// Help topics data
const helpTopics = {
  'ai-provider-url': {
    title: 'AI 服务地址配置',
    steps: [
      { title: '选择服务商', body: '在下拉菜单中选择你要使用的 AI 服务商。国内推荐使用 <strong>小米 MIMO</strong> 或 <strong>DeepSeek</strong>，访问速度快且价格低。' },
      { title: '小米 MIMO（推荐）', body: '访问 <a href="https://mimo.xiaomi.com" target="_blank">mimo.xiaomi.com</a>，注册账号后在「API 管理」页面获取 API 地址。免费额度充足，适合日常使用。' },
      { title: 'DeepSeek', body: '访问 <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>，注册后在「API 文档」页面获取地址。价格极低，性能优秀。' },
      { title: '自定义地址', body: '如果你使用其他 OpenAI 兼容的服务商（如 OpenAI、Claude 等），选择「自定义」后填入完整的 API 地址，格式为 <code>https://xxx/v1/chat/completions</code>。' },
    ],
  },
  'ai-api-key': {
    title: '获取 API Key',
    steps: [
      { title: '进入控制台', body: '登录你选择的 AI 服务商官网，进入开发者控制台。' },
      { title: '找到密钥管理', body: '在控制台中找到「API Keys」或「密钥管理」菜单。' },
      { title: '创建并复制', body: '点击「创建 API Key」，复制生成的密钥。<strong>注意：密钥只会显示一次</strong>，请立即保存。' },
      { title: '粘贴到此处', body: '将复制的密钥粘贴到左侧输入框。密钥仅存储在本地服务器，不会发送到第三方。' },
    ],
  },
  'ai-model': {
    title: '模型名称',
    steps: [
      { title: '各服务商模型名', body: '不同服务商的模型名称不同：<br>小米 MIMO：<code>mimo-v2.5-pro</code><br>DeepSeek：<code>deepseek-chat</code><br>OpenAI：<code>gpt-4o</code>' },
      { title: '查看可用模型', body: '在服务商的 API 文档中查看所有可用模型列表，选择适合你需求的模型。' },
    ],
  },
  'wechat-app-id': {
    title: '获取微信公众号 AppID',
    steps: [
      { title: '登录公众号平台', body: '访问 <a href="https://mp.weixin.qq.com" target="_blank">mp.weixin.qq.com</a>，使用管理员微信扫码登录。' },
      { title: '完成认证', body: '如果公众号未认证，需要先完成微信认证（订阅号需企业资质，个人号无法使用高级接口）。' },
      { title: '获取 AppID', body: '进入「设置与开发」>「基本配置」页面，找到「开发者ID(AppID)」并复制。' },
    ],
  },
  'wechat-app-secret': {
    title: '获取微信公众号 AppSecret',
    steps: [
      { title: '进入基本配置', body: '在公众号后台「设置与开发」>「基本配置」页面，与 AppID 在同一页面。' },
      { title: '生成密钥', body: '点击「开发者密码(AppSecret)」旁的「生成」按钮，使用管理员微信扫码确认。' },
      { title: '立即复制', body: '<strong>AppSecret 只会显示一次</strong>，请立即复制保存。如果遗失，可以在同一页面重置。' },
    ],
  },
  'pexels-key': {
    title: '获取 Pexels API Key',
    steps: [
      { title: '访问 Pexels API', body: '打开 <a href="https://www.pexels.com/api/" target="_blank">pexels.com/api</a>，点击页面上的申请入口。' },
      { title: '填写申请表', body: '填写项目名称和用途描述（如实填写即可，如"personal blog image sourcing"），提交申请。' },
      { title: '获取 Key', body: 'API Key 会立即显示在页面上，复制即可使用。Pexels 对个人使用完全免费。' },
    ],
  },
  'bing-key': {
    title: '获取 Bing 图片搜索 API Key',
    steps: [
      { title: '登录 Azure 门户', body: '打开 <a href="https://portal.azure.com" target="_blank">portal.azure.com</a>，使用微软账号登录。' },
      { title: '创建搜索资源', body: '点击「创建资源」> 搜索「Bing Search v7」> 创建。选择免费定价层（F0）即可。' },
      { title: '复制密钥', body: '创建完成后，进入资源页面 >「密钥和终结点」，复制「密钥1」的值。' },
    ],
  },
  'cogview-key': {
    title: '获取智谱 CogView API Key',
    steps: [
      { title: '注册智谱账号', body: '打开 <a href="https://open.bigmodel.cn" target="_blank">open.bigmodel.cn</a>，使用手机号注册账号。' },
      { title: '进入 API Keys', body: '登录后在控制台找到「API Keys」菜单。' },
      { title: '创建 Key', body: '点击「创建 API Key」，复制生成的密钥。智谱免费额度包含图片生成功能。' },
    ],
  },
  'tongyi-key': {
    title: '获取通义万相 API Key',
    steps: [
      { title: '登录阿里云', body: '打开 <a href="https://dashscope.aliyun.com" target="_blank">dashscope.aliyun.com</a>，使用阿里云账号登录。' },
      { title: '开通服务', body: '首次使用需要开通 DashScope 服务（免费）。' },
      { title: '创建 API Key', body: '进入「API-KEY 管理」页面，创建新的 API Key 并复制。' },
    ],
  },
  'custom-ai-endpoint': {
    title: '自定义 AI 生图端点',
    steps: [
      { title: '接口格式', body: '端点需接受 POST 请求，请求体为 <code>{"prompt": "图片描述"}</code>。' },
      { title: '返回格式', body: '需返回 JSON，包含图片 URL 字段，支持以下格式：<code>{"url": "https://..."}</code> 或 <code>{"data": [{"url": "https://..."}]}</code>。' },
      { title: '适用场景', body: '可用于对接本地 Stable Diffusion WebUI、ComfyUI 或其他自部署的 AI 生图服务。' },
    ],
  },
  'cron-schedule': {
    title: '定时任务设置',
    steps: [
      { title: '执行频率', body: '选择执行频率：<strong>每天</strong>（每天都执行）、<strong>工作日</strong>（周一到周五）、<strong>周末</strong>（周六和周日）。' },
      { title: '执行时间', body: '使用时间选择器设置具体的执行时间，如 <code>20:00</code>。' },
    ],
  },
  'wechat-setup': {
    title: '获取微信公众号信息',
    steps: [
      { title: '打开微信公众平台', body: '在浏览器中打开 <a href="https://mp.weixin.qq.com" target="_blank">mp.weixin.qq.com</a>，使用公众号管理员的微信扫码登录。' },
      { title: '进入基本配置', body: '登录成功后，在左侧菜单栏中找到「设置与开发」，点击展开后选择「基本配置」。' },
      { title: '复制 AppID', body: '在基本配置页面顶部，找到「开发者ID(AppID)」一栏，点击右侧的「复制」按钮，将 AppID 复制到剪贴板。' },
      { title: '生成 AppSecret', body: '在 AppID 下方找到「开发者密码(AppSecret)」，点击「生成」按钮。<strong>此时需要用管理员微信扫码确认</strong>。' },
      { title: '立即保存好密钥', body: '生成成功后 AppSecret 会显示在页面上。<strong style="color:#ef4444">注意：密钥只会显示一次</strong>，请立即复制并保存到安全的地方。如果丢失，只能重置重新生成。' },
      { title: '粘贴到输入框', body: '将复制的 AppID 和 AppSecret 分别粘贴到左侧的两个输入框中，然后点击「验证并保存」按钮即可完成绑定。' },
    ],
  },
};

function app() {
  return {
    adminOpen: false,
    adminPassword: '',
    adminVerified: false,
    adminTab: 'ai',
    toast: { show: false, message: '', type: 'success' },
    helpPanel: { open: false, topicId: null },

    init() {
      window.addEventListener('toast', (e) => {
        this.toast = { show: true, message: e.detail.message, type: e.detail.type };
        setTimeout(() => { this.toast.show = false; }, 3000);
      });
      window.addEventListener('open-help', (e) => {
        this.helpPanel.topicId = e.detail.topicId;
        this.helpPanel.open = true;
      });
      window.addEventListener('close-help', () => {
        this.helpPanel.open = false;
        setTimeout(() => { this.helpPanel.topicId = null; }, 300);
      });
    },

    get currentTopic() {
      return this.helpPanel.topicId ? helpTopics[this.helpPanel.topicId] : null;
    },

    openAdmin() {
      this.adminOpen = true;
      this.adminPassword = '';
      this.adminVerified = false;
      this.adminTab = 'ai';
    },

    closeAdmin() {
      this.adminOpen = false;
      this.adminPassword = '';
      this.adminVerified = false;
    },

    verifyAdmin() {
      // 管理员密码，可在本文件中修改
      if (this.adminPassword === 'hrj5201314') {
        this.adminVerified = true;
        showToast('验证成功', 'success');
      } else {
        this.adminPassword = '';
        showToast('密码错误', 'error');
      }
    },

    switchAdminTab(tab) {
      this.adminTab = tab;
    },
  };
}

function settingsPage() {
  return {
    config: {},
    sections: { ai: true, wechat: false, image: false, schedule: false },
    testing: { ai: false, wechat: false, pexels: false, bing: false },
    testResults: {},
    imageSourceOptions: [
      { value: 'pexels', label: 'Pexels' },
      { value: 'bing', label: 'Bing 图片' },
      { value: 'cogview', label: '智谱 CogView' },
      { value: 'tongyi', label: '通义万相' },
      { value: 'custom-ai', label: '自定义 AI' },
    ],
    saving: false,
    scheduleFrequency: 'daily',
    scheduleTime: '20:00',

    async load() {
      const res = await api.getConfig();
      if (res.success) {
        for (const [cat, vals] of Object.entries(res.data)) {
          for (const [key, val] of Object.entries(vals)) {
            this.config[key] = val;
          }
        }
        this.loadScheduleFromCron(this.config['schedule.cron'] || '0 20 * * *');
      }
    },

    async testAI() {
      this.testing.ai = true; this.testResults.ai = null;
      try { this.testResults.ai = await api.testAI(); } finally { this.testing.ai = false; }
    },

    async testWeChat() {
      this.testing.wechat = true; this.testResults.wechat = null;
      try { this.testResults.wechat = await api.testWeChat(); } finally { this.testing.wechat = false; }
    },

    async testPexels() {
      this.testing.pexels = true; this.testResults.pexels = null;
      try { this.testResults.pexels = await api.testPexels(); } finally { this.testing.pexels = false; }
    },

    async testBing() {
      this.testing.bing = true; this.testResults.bing = null;
      try { this.testResults.bing = await api.testBing(); } finally { this.testing.bing = false; }
    },

    hasImageSource(src) {
      return (this.config['image.sources'] || '').split(',').map(function(s) { return s.trim(); }).indexOf(src) !== -1;
    },

    toggleImageSource(src, enabled) {
      var sources = (this.config['image.sources'] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      if (enabled && sources.indexOf(src) === -1) {
        sources.push(src);
      } else if (!enabled) {
        sources = sources.filter(function(s) { return s !== src; });
      }
      this.config['image.sources'] = sources.join(',');
    },

    async saveConfig() {
      this.saving = true;
      try {
        const updates = Object.entries(this.config)
          .filter(([key, val]) => typeof val === 'string' && !val.startsWith('****'))
          .map(([key, value]) => ({ key, value }));
        const res = await api.updateConfig(updates);
        const msg = res.success
          ? `保存成功 (${updates.length}项) - ${res.message}`
          : `保存失败: ${res.error}`;
        showToast(msg, res.success ? 'success' : 'error');
        if (res.success) {
          await this.load();
          showToast('已重新加载配置', 'success');
        }
      } finally { this.saving = false; }
    },

    updateCronFromSchedule() {
      const [h, m] = this.scheduleTime.split(':');
      const freqMap = { daily: '* *', weekdays: '1-5 *', weekend: '0,6 *' };
      const [dow, dom] = freqMap[this.scheduleFrequency].split(' ');
      this.config['schedule.cron'] = `${parseInt(m)} ${parseInt(h)} * ${dom} ${dow}`;
    },

    loadScheduleFromCron(cron) {
      const parts = cron.split(' ');
      if (parts.length !== 5) return;
      const [min, hour, , dom, dow] = parts;
      this.scheduleTime = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
      if (dow === '1-5') this.scheduleFrequency = 'weekdays';
      else if (dow === '0,6') this.scheduleFrequency = 'weekend';
      else this.scheduleFrequency = 'daily';
    },

    describeSchedule() {
      const labels = { daily: '每天', weekdays: '工作日', weekend: '周末' };
      return `${labels[this.scheduleFrequency] || ''} ${this.scheduleTime} 执行`;
    },
  };
}

function generatePage() {
  return {
    // 步骤：0=绑定微信, 1=输入主题, 2=生成中/预览, 3=选配图, 4=发布成功
    step: 0,

    // 微信绑定
    wechatId: '',
    wechatSecret: '',
    verifying: false,
    wechatError: '',
    wechatBound: false,

    // 主题输入
    topic: '',

    // 生成流程
    generating: false,
    streamingContent: '',
    article: null,
    images: [],
    selectedImages: [],
    publishing: false,
    error: '',
    statusMessage: '',

    init() {
      const savedId = localStorage.getItem('wechat_app_id');
      const savedSecret = localStorage.getItem('wechat_app_secret');
      if (savedId && savedSecret) {
        this.wechatId = savedId;
        this.wechatSecret = savedSecret;
        this.wechatBound = true;
        this.step = 1;
      }
    },

    async verifyWechat() {
      if (!this.wechatId || !this.wechatSecret) {
        this.wechatError = '请填写 AppID 和 AppSecret';
        return;
      }
      this.verifying = true;
      this.wechatError = '';
      try {
        const res = await api.verifyWechat(this.wechatId, this.wechatSecret);
        if (res.success) {
          localStorage.setItem('wechat_app_id', this.wechatId);
          localStorage.setItem('wechat_app_secret', this.wechatSecret);
          this.wechatBound = true;
          this.step = 1;
          showToast('微信绑定成功', 'success');
        } else {
          this.wechatError = res.error || '验证失败';
        }
      } catch (err) {
        this.wechatError = err.message;
      } finally {
        this.verifying = false;
      }
    },

    unbindWechat() {
      localStorage.removeItem('wechat_app_id');
      localStorage.removeItem('wechat_app_secret');
      this.wechatId = '';
      this.wechatSecret = '';
      this.wechatBound = false;
      this.wechatError = '';
      this.step = 0;
      showToast('已解除公众号绑定', 'success');
    },

    resetState() {
      this.generating = false;
      this.streamingContent = '';
      this.article = null;
      this.images = [];
      this.selectedImages = [];
      this.publishing = false;
      this.error = '';
      this.statusMessage = '';
    },

    async startGeneration() {
      if (!this.topic.trim()) {
        showToast('请先输入文章主题', 'error');
        return;
      }
      this.resetState();
      this.step = 2;
      this.generating = true;
      this.statusMessage = '正在连接 AI 服务...';

      try {
        const response = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: this.topic }),
        });

        if (!response.ok) {
          const err = await response.json();
          this.error = err.error || '请求失败';
          this.generating = false;
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ') && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (currentEvent) {
                  case 'status':
                    this.statusMessage = data.message;
                    break;
                  case 'chunk':
                    this.streamingContent += data.text;
                    break;
                  case 'article':
                    this.article = data;
                    break;
                  case 'images':
                    this.images = data;
                    break;
                  case 'complete':
                    this.article = data.article;
                    this.images = data.images || [];
                    this.generating = false;
                    break;
                  case 'error':
                    this.error = data.message;
                    this.generating = false;
                    break;
                }
              } catch (e) {}
              currentEvent = '';
            }
          }
        }
      } catch (err) {
        this.error = err.message;
        this.generating = false;
      }
    },

    goToImages() {
      this.step = 3;
    },

    isImageSelected(idx) {
      return this.selectedImages.includes(this.images[idx]);
    },

    getSelectedIndex(idx) {
      return this.selectedImages.indexOf(this.images[idx]);
    },

    toggleImageSelection(idx) {
      const img = this.images[idx];
      const pos = this.selectedImages.indexOf(img);
      if (pos === -1) {
        this.selectedImages.push(img);
      } else {
        this.selectedImages.splice(pos, 1);
      }
    },

    async publishArticle() {
      if (!this.article) return;
      this.publishing = true;

      try {
        const appId = localStorage.getItem('wechat_app_id');
        const appSecret = localStorage.getItem('wechat_app_secret');
        const res = await api.publish(this.article, this.selectedImages, 0, appId, appSecret);
        if (res.success) {
          this.step = 4;
          showToast('已发布到微信草稿箱', 'success');
        } else {
          showToast(res.error || '发布失败', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        this.publishing = false;
      }
    },

    startOver() {
      this.resetState();
      this.step = 1;
      this.topic = '';
    },
  };
}

function historyPage() {
  return {
    items: [],
    expanded: false,

    get displayItems() {
      return this.expanded ? this.items : this.items.slice(0, 3);
    },

    async load() {
      const res = await api.getHistory();
      if (res.success) this.items = res.data.items;
    },
  };
}
