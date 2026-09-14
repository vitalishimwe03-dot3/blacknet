const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { optionalAuth } = require('../middleware');

// Get hashtag page
router.get('/:name', optionalAuth, (req, res) => {
  try {
    const name = req.params.name.toLowerCase();
    const hashtag = db.prepare('SELECT * FROM hashtags WHERE name = ?').get(name);
    if (!hashtag) return res.status(404).json({ error: 'Hashtag not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN post_hashtags ph ON p.id = ph.post_id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.name = ? AND p.visibility = 'public'
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(name, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM posts p
      JOIN post_hashtags ph ON p.id = ph.post_id
      JOIN hashtags h ON ph.hashtag_id = h.id
      WHERE h.name = ? AND p.visibility = 'public'
    `).get(name).count;

    // Enrich posts
    const enriched = posts.map(post => {
      const media = db.prepare('SELECT pm.*, f.id as file_id, f.filename, f.original_name, f.mime_type, f.file_size, f.category, f.thumbnail_path FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ?').all(post.id);
      let isLiked = false, isBookmarked = false;
      if (req.user) {
        isLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
        isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
      }
      const postHashtags = db.prepare('SELECT h.name FROM post_hashtags ph JOIN hashtags h ON ph.hashtag_id = h.id WHERE ph.post_id = ?').all(post.id).map(h => h.name);
      return { ...post, media, is_liked: isLiked, is_bookmarked: isBookmarked, hashtags: postHashtags };
    });

    res.json({ hashtag, posts: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hashtag' });
  }
});

// Trending hashtags
router.get('/', (req, res) => {
  try {
    const trending = db.prepare('SELECT * FROM hashtags ORDER BY posts_count DESC LIMIT 20').all();
    res.json({ hashtags: trending });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hashtags' });
  }
});

module.exports = router;
