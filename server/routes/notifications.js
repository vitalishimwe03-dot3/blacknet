const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware } = require('../middleware');

// Get notifications
router.get('/', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = (page - 1) * limit;

    const notifications = db.prepare(`
      SELECT n.*, u.username as from_username, u.display_name as from_display_name, u.avatar as from_avatar
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(req.user.id).count;
    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;

    res.json({ notifications, total, unread, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark as read
router.put('/read', authMiddleware, (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, req.user.id);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
    }
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Unread count
router.get('/unread', authMiddleware, (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0').get(req.user.id).count;
    res.json({ notifications: count, messages: messageCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

module.exports = router;
