# 微信公众号自动发布系统

AI 驱动的微信公众号自动发布系统，独立运行无需 n8n，支持通过 Web 界面配置 AI 模型、多源配图、定时任务，每个配置项都有获取教程。

## 功能特性

- **AI 模型配置**：支持小米 MIMO、DeepSeek、OpenAI 等任意 OpenAI 兼容 API
- **微信公众号集成**：自动获取 access_token、上传封面图、创建草稿
- **多源智能配图**：Pexels + Bing 图片搜索 + 智谱 CogView + 通义万相 AI 生图 + 自定义端点，中国大陆均可访问
- **内容关联配图**：根据文章关键词和主题自动匹配图片，AI 生图根据文章内容生成
- **定时发布**：node-cron 定时任务，支持预设和自定义 Cron 表达式
- **配置教程**：每个配置项右侧 `?` 按钮，点击滑入分步获取指南
- **提示词编辑**：可视化编辑 AI 系统提示词和用户提示词
- **SSE 流式生成**：实时预览 AI 生成过程，支持 6 个文章模板（女性成长、职场洞察、人生哲思、情感真相、育儿智慧、健康身心）
- **4 步生成流程**：选模板 → 流式预览 → 图片选择 → 发布到草稿箱
- **文章历史**：查看生成记录和状态

## 快速开始

### 方式一：Docker

```bash
git clone https://github.com/jackws/wechat-auto-publisher.git
cd wechat-auto-publisher
cp .env.example .env
# 编辑 .env 填入你的配置
docker compose up -d
```

### 方式二：本地运行

```bash
git clone https://github.com/jackws/wechat-auto-publisher.git
cd wechat-auto-publisher
npm install
cp .env.example .env
# 编辑 .env 填入你的配置
npm start
```

访问 http://localhost:3000 进入管理界面。

## 配置说明

所有配置均可通过 Web UI 设置，也可通过环境变量预设。

| 变量 | 必填 | 说明 |
|------|------|------|
| `AI_PROVIDER_URL` | 否 | AI API 地址，默认小米 MIMO |
| `AI_API_KEY` | 否 | AI API 密钥 |
| `AI_MODEL` | 否 | AI 模型名称，默认 `mimo-v2.5-pro` |
| `WECHAT_APP_ID` | 否 | 微信公众号 AppID |
| `WECHAT_APP_SECRET` | 否 | 微信公众号 AppSecret |
| `IMAGE_SOURCES` | 否 | 启用的图片来源，逗号分隔：`pexels,bing,cogview,tongyi,custom-ai` |
| `PEXELS_API_KEY` | 否 | Pexels 图片 API 密钥 |
| `BING_KEY` | 否 | Bing 图片搜索 API Key（Azure） |
| `COGVIEW_KEY` | 否 | 智谱 CogView API Key |
| `TONGYI_KEY` | 否 | 阿里云通义万相 API Key |
| `IMAGE_AI_COUNT` | 否 | AI 生图数量，默认 2 |
| `PORT` | 否 | 应用端口，默认 `3000` |

## 使用流程

1. 打开 Web UI，在"系统配置"页面填写各项配置（每项右侧有 `?` 教程）
2. 点击"测试连接"验证配置是否正确
3. 点击"保存配置"
4. 在仪表盘点击"激活"启动定时任务
5. 如需立即生成文章，点击"立即触发"

## 图片源说明

| 来源 | 类型 | 中国大陆 | 说明 |
|------|------|----------|------|
| Pexels | 图库搜索 | 可访问 | 免费高质量图库 |
| Bing 图片 | 图库搜索 | 可访问 | 需 Azure 订阅 |
| 智谱 CogView | AI 生图 | 可访问 | 根据文章内容生成 |
| 通义万相 | AI 生图 | 可访问 | 阿里云服务 |
| 自定义端点 | AI 生图 | 自行部署 | POST `{"prompt":"..."}` → `{"url":"..."}` |

## 技术架构

```
┌─────────────────┐     ┌──────────────────────────────┐
│   Web 管理界面   │────>│       Express.js 后端         │
│  (Alpine.js)    │     │  ┌────────────────────────┐  │
│  帮助教程面板    │     │  │  node-cron 定时器       │  │
└─────────────────┘     │  │  AI API → 解析截断      │  │
                        │  │  多源配图 → 合并        │  │
                        │  │  微信上传 → 创建草稿    │  │
                        │  └────────────────────────┘  │
                        │  data/config.json (配置)      │
                        │  data/history.json (历史)     │
                        └──────────────────────────────┘
```

## 许可证

MIT
