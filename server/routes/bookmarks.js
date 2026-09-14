const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware');

// Toggle bookmark
router.post('/:postId', authMiddleware, (req, res) => {
  try {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.postId);

    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      res.json({ bookmarked: false });
    } else {
      db.prepare('INSERT INTO bookmarks (id, user_id, post_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.postId);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process bookmark' });
  }
});

// Get bookmarks
router.get('/', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const bookmarks = db.prepare(`
      SELECT b.*, p.content, p.visibility, p.likes_count, p.comments_count, p.shares_count, p.created_at as post_created_at,
        u.username, u.display_name, u.avatar
      FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?').get(req.user.id).count;

    res.json({ bookmarks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

module.exports = router;
