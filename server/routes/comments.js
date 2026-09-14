const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware');

// Get comments for a post
router.get('/post/:postId', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = (page - 1) * limit;

    const comments = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).all(req.params.postId, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND parent_id IS NULL').get(req.params.postId).count;

    const enriched = comments.map(comment => {
      const replies = db.prepare(`
        SELECT c.*, u.username, u.display_name, u.avatar
        FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ? ORDER BY c.created_at ASC LIMIT 5
      `).all(comment.id);

      const likesCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE comment_id = ?').get(comment.id).count;
      let isLiked = false;
      if (req.user) {
        isLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND comment_id = ?').get(req.user.id, comment.id);
      }

      return { ...comment, likes_count: likesCount, is_liked: isLiked, replies };
    });

    res.json({ comments: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create comment
router.post('/', authMiddleware, (req, res) => {
  try {
    const { postId, content, parentId } = req.body;
    
    if (!postId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Post ID and content required' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment too long (max 2000 characters)' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (parentId) {
      const parent = db.prepare('SELECT * FROM comments WHERE id = ? AND post_id = ?').get(parentId, postId);
      if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
      if (parent.parent_id) {
        return res.status(400).json({ error: 'Nested replies limited to one level' });
      }
    }

    const id = uuidv4();
    db.prepare('INSERT INTO comments (id, post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)')
      .run(id, postId, req.user.id, parentId || null, content.trim());
    
    db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(postId);

    if (post.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (id, user_id, from_user_id, type, reference_id, reference_type, content) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), post.user_id, req.user.id, 'comment', postId, 'post', content.trim().slice(0, 100));
    }

    const comment = db.prepare('SELECT c.*, u.username, u.display_name, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(id);
    res.status(201).json({ ...comment, likes_count: 0, is_liked: false, replies: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete comment
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const replyCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE parent_id = ?').get(req.params.id).count;
    db.prepare('DELETE FROM likes WHERE comment_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE parent_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE posts SET comments_count = MAX(0, comments_count - ?) WHERE id = ?').run(1 + replyCount, comment.post_id);

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Like/unlike comment
router.post('/:id/like', authMiddleware, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND comment_id = ?').get(req.user.id, req.params.id);
    
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
      db.prepare('UPDATE comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(req.params.id);
      res.json({ liked: false, likes_count: Math.max(0, comment.likes_count - 1) });
    } else {
      db.prepare('INSERT INTO likes (id, user_id, comment_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.id);
      db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
      res.json({ liked: true, likes_count: comment.likes_count + 1 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process like' });
  }
});

// Report comment
router.post('/:id/report', authMiddleware, (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO reports (id, reporter_id, comment_id, reason, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, req.params.id, reason, description || '');

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
