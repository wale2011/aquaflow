const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', authenticate, (req, res) => {
  try {
    const { unread_only = false, limit = 30, offset = 0 } = req.query;
    let sql = `
      SELECT * FROM notifications WHERE user_id = ?
      ${unread_only === 'true' ? 'AND is_read = 0' : ''}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `;
    const notifications = db.prepare(sql).all(req.user.id, parseInt(limit), parseInt(offset));
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);

    res.json({ success: true, notifications, unread_count: unreadCount.count });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

module.exports = router;
