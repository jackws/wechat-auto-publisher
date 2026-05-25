require('dotenv').config();

const express = require('express');
const path = require('path');
const configManager = require('./services/config-manager');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Seed config from .env on first run
configManager.seedFromEnv();

// Start scheduler
startScheduler();

// API routes
app.use('/api/config', require('./routes/config'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/history', require('./routes/history'));
app.use('/api/generate', require('./routes/generate'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', configured: configManager.isConfigured() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`微信公众号自动发布系统已启动: http://localhost:${PORT}`);
});
