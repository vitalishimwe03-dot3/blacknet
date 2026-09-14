const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { optionalAuth, authMiddleware } = require('../middleware');

// Global search
router.get('/', optionalAuth, (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.trim().length === 0) return res.json({ users: [], posts: [], hashtags: [] });

    const query = q.trim();
    const limit = parseInt(req.query.limit) || 20;

    const results = {};

    if (!type || type === 'users') {
      results.users = db.prepare(`
        SELECT id, username, display_name, avatar, bio, is_verified
        FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND is_suspended = 0
        ORDER BY (SELECT COUNT(*) FROM follows WHERE following_id = users.id) DESC LIMIT ?
      `).all(`%${query}%`, `%${query}%`, limit);
    }

    if (!type || type === 'posts') {
      results.posts = db.prepare(`
        SELECT p.*, u.username, u.display_name, u.avatar
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.content LIKE ? AND p.visibility = 'public'
        ORDER BY p.created_at DESC LIMIT ?
      `).all(`%${query}%`, limit).map(post => {
        const media = db.prepare('SELECT pm.*, f.id as file_id, f.filename, f.original_name, f.mime_type, f.file_size, f.category, f.thumbnail_path FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ?').all(post.id);
        return { ...post, media };
      });
    }

    if (!type || type === 'hashtags') {
      results.hashtags = db.prepare('SELECT * FROM hashtags WHERE name LIKE ? ORDER BY posts_count DESC LIMIT ?').all(`%${query}%`, limit);
    }

    // Save search history if authenticated
    if (req.user) {
      db.prepare('INSERT INTO search_history (id, user_id, query) VALUES (?, ?, ?)').run(require('uuid').v4(), req.user.id, query);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search suggestions
router.get('/suggestions', optionalAuth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] });

    const suggestions = db.prepare(`
      SELECT username, display_name, avatar FROM users
      WHERE username LIKE ? AND is_suspended = 0 LIMIT 5
    `).all(`%${q}%`);

    const hashtags = db.prepare('SELECT name, posts_count FROM hashtags WHERE name LIKE ? ORDER BY posts_count DESC LIMIT 5').all(`%${q}%`);

    res.json({ users: suggestions, hashtags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Recent searches
router.get('/recent', authMiddleware, (req, res) => {
  try {
    const recent = db.prepare('SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
    res.json({ searches: recent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

// Clear recent searches
router.delete('/recent', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Search history cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;
