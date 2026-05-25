# wechat-auto-publisher

AI 驱动的微信公众号自动发布系统。Express.js 后端 + Alpine.js 前端，无构建步骤。

## Architecture

- `server/index.js` — Express 入口，挂载路由和服务
- `server/routes/` — API 路由：config, generate, workflow, history
- `server/services/` — 业务逻辑：pipeline, config-manager, image-service, templates, scheduler
- `server/db/database.js` — JsonStore 持久化到 `data/*.json`
- `public/` — 前端 SPA（Alpine.js），无打包工具

## Key Rules

- Config persistence: `data/config.json`, `data/workflow.json`, `data/history.json` — JsonStore writes on every `.set()` call
- SSE streaming: `POST /api/generate/stream` uses `res.write()` with `event:` + `data:` format
- After updating config via API, server memory must be in sync — restart server if config changes don't take effect
- Image sources: Pexels (free), Bing (Azure), CogView (Zhipu), Tongyi (Alibaba), custom endpoint
- Article limit: 850 Chinese characters max, auto-truncated at `<h2>`/`<p>` boundaries
- WeChat API: access_token → upload cover → create draft (all in `pipeline.js` and `generate.js`)
- **Config save requires `_v: 2`** in PUT body — old code requests are silently rejected to prevent stale browser tabs from corrupting config
- **AI config protection**: `ai.provider_url` must contain `/v1/`, `ai.api_key` must start with `tp-`, known bad keys are blacklisted
- **Anthropic API support**: pipeline.js and config.js auto-detect Anthropic endpoints (URL contains `anthropic`) and use `x-api-key` header + `system` field in request body
- **Scheduler auto-reload**: changing `schedule.cron` via config API automatically restarts the cron job

## Routes

| Method | Path | Handler |
|--------|------|---------|
| GET | /api/config | config.js |
| PUT | /api/config | config.js |
| POST | /api/config/test-ai | config.js |
| POST | /api/config/test-wechat | config.js |
| POST | /api/config/test-pexels | config.js |
| POST | /api/config/test-bing | config.js |
| POST | /api/generate/stream | generate.js (SSE) |
| POST | /api/generate/publish | generate.js |
| GET | /api/workflow/status | workflow.js |
| POST | /api/workflow/activate | workflow.js |
| POST | /api/workflow/deactivate | workflow.js |
| POST | /api/workflow/trigger | workflow.js |
| GET | /api/history | history.js |
| GET | /api/templates | (in index.js) |
