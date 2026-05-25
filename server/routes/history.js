const express = require('express');
const router = express.Router();
const { historyStore } = require('../db/database');

// GET /api/history
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const items = historyStore.get('items', []);
    const total = items.length;
    const offset = (page - 1) * limit;
    const paged = items.slice(offset, offset + limit);

    res.json({
      success: true,
      data: { items: paged, total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history/:id
router.get('/:id', (req, res) => {
  try {
    const items = historyStore.get('items', []);
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

