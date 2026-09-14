const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware');

// Helper to extract and process hashtags
function processHashtags(postId, content) {
  const matches = content.match(/#(\w+)/g);
  if (!matches) return;
  
  matches.forEach(match => {
    const name = match.slice(1).toLowerCase();
    let hashtag = db.prepare('SELECT id FROM hashtags WHERE name = ?').get(name);
    if (!hashtag) {
      const id = uuidv4();
      db.prepare('INSERT INTO hashtags (id, name) VALUES (?, ?)').run(id, name);
      hashtag = { id };
    }
    db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)').run(postId, hashtag.id);
    db.prepare('UPDATE hashtags SET posts_count = (SELECT COUNT(*) FROM post_hashtags WHERE hashtag_id = ?) WHERE id = ?').run(hashtag.id, hashtag.id);
  });
}

function cleanupOrphanedHashtags() {
  const orphans = db.prepare(`
    SELECT h.id FROM hashtags h
    WHERE (SELECT COUNT(*) FROM post_hashtags WHERE hashtag_id = h.id) = 0
  `).all();
  if (orphans.length > 0) {
    const ids = orphans.map(o => o.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM hashtags WHERE id IN (${placeholders})`).run(...ids);
  }
}

function recalcLikesCount(postId) {
  const count = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;
  db.prepare('UPDATE posts SET likes_count = ? WHERE id = ?').run(count, postId);
}

// Get feed
router.get('/feed', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ? OR p.visibility = 'public')
        AND NOT p.user_id IN (SELECT u2.id FROM users u2 WHERE u2.is_suspended = 1)
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, req.user.id, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM posts p
      WHERE (p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ? OR p.visibility = 'public')
        AND NOT p.user_id IN (SELECT u2.id FROM users u2 WHERE u2.is_suspended = 1)
    `).get(req.user.id, req.user.id).count;

    const enrichedPosts = enrichPosts(posts, req.user.id);
    res.json({ posts: enrichedPosts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Get explore
router.get('/explore', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.visibility = 'public'
      ORDER BY p.likes_count DESC, p.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) as count FROM posts WHERE visibility = 'public'").get().count;
    const enrichedPosts = enrichPosts(posts, req.user?.id);
    
    // Trending hashtags
    const trending = db.prepare('SELECT * FROM hashtags ORDER BY posts_count DESC LIMIT 10').all();
    
    // Popular users
    const popularUsers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.is_verified,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
      FROM users u WHERE u.is_suspended = 0 AND u.role = 'user'
      ORDER BY followers_count DESC LIMIT 10
    `).all();

    res.json({ posts: enrichedPosts, total, page, pages: Math.ceil(total / limit), trending, popular_users: popularUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch explore' });
  }
});

// Create post
router.post('/', authMiddleware, (req, res) => {
  try {
    const { content, mediaIds, visibility } = req.body;
    
    if (!content && (!mediaIds || mediaIds.length === 0)) {
      return res.status(400).json({ error: 'Post must have content or media' });
    }

    if (content && content.length > 10000) {
      return res.status(400).json({ error: 'Content too long (max 10000 characters)' });
    }

    const validVisibility = ['public', 'followers', 'private'].includes(visibility) ? visibility : 'public';
    const postId = uuidv4();
    
    db.prepare(`INSERT INTO posts (id, user_id, content, visibility) VALUES (?, ?, ?, ?)`)
      .run(postId, req.user.id, content || '', validVisibility);

    // Attach media
    if (mediaIds && mediaIds.length > 0) {
      mediaIds.forEach((fileId, index) => {
        const file = db.prepare('SELECT id FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);
        if (file) {
          db.prepare('INSERT INTO post_media (id, post_id, file_id, order_index) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), postId, fileId, index);
        }
      });
    }

    // Process hashtags
    if (content) processHashtags(postId, content);

    const post = db.prepare('SELECT p.*, u.username, u.display_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(postId);
    const media = db.prepare('SELECT pm.*, f.* FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ?').all(postId);
    
    res.status(201).json({ ...post, media, likes_count: 0, is_liked: false, is_bookmarked: false, hashtags: content ? (content.match(/#(\w+)/g) || []).map(h => h.slice(1)) : [] });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get single post
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const post = db.prepare('SELECT p.*, u.username, u.display_name, u.avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const enriched = enrichPosts([post], req.user?.id)[0];
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Delete post
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const media = db.prepare('SELECT f.* FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ?').all(req.params.id);

    db.prepare('DELETE FROM post_media WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM post_hashtags WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM likes WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bookmarks WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);

    cleanupOrphanedHashtags();

    media.forEach(m => {
      try {
        const filePath = path.join(__dirname, '..', m.file_path);
        fs.unlinkSync(filePath);
        db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(m.file_size, m.user_id);
      } catch (e) {}
    });

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like/unlike
router.post('/:id/like', authMiddleware, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
    
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      recalcLikesCount(req.params.id);
      const newCount = db.prepare('SELECT likes_count FROM posts WHERE id = ?').get(req.params.id).likes_count;
      res.json({ liked: false, likes_count: newCount });
    } else {
      db.prepare('INSERT INTO likes (id, user_id, post_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.id);
      recalcLikesCount(req.params.id);
      
      if (post.user_id !== req.user.id) {
        db.prepare('INSERT INTO notifications (id, user_id, from_user_id, type, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), post.user_id, req.user.id, 'like', req.params.id, 'post');
      }
      
      const newCount = db.prepare('SELECT likes_count FROM posts WHERE id = ?').get(req.params.id).likes_count;
      res.json({ liked: true, likes_count: newCount });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process like' });
  }
});

// Share post (increment share count)
router.post('/:id/share', authMiddleware, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    db.prepare('UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ shares_count: post.shares_count + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share' });
  }
});

// Report post
router.post('/:id/report', authMiddleware, (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO reports (id, reporter_id, post_id, reason, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, req.params.id, reason, description || '');

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

function enrichPosts(posts, userId) {
  return posts.map(post => {
    const media = db.prepare('SELECT pm.*, f.id as file_id, f.filename, f.original_name, f.mime_type, f.file_size, f.category, f.thumbnail_path, f.user_id as file_user_id FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ? ORDER BY pm.order_index').all(post.id);
    let isLiked = false, isBookmarked = false;
    if (userId) {
      isLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(userId, post.id);
      isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, post.id);
    }
    const hashtags = db.prepare('SELECT h.name FROM post_hashtags ph JOIN hashtags h ON ph.hashtag_id = h.id WHERE ph.post_id = ?').all(post.id).map(h => h.name);
    const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(post.id).count;
    return { ...post, media, is_liked: isLiked, is_bookmarked: isBookmarked, hashtags, comments_count: commentsCount };
  });
}

module.exports = router;
