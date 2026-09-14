const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware');
const fs = require('fs');
const path = require('path');

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const stats = {
      total_users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      total_posts: db.prepare('SELECT COUNT(*) as count FROM posts').get().count,
      total_comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
      total_files: db.prepare('SELECT COUNT(*) as count FROM files').get().count,
      total_storage: db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM files').get().total,
      pending_reports: db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get().count,
      new_users_today: db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").get().count,
      new_posts_today: db.prepare("SELECT COUNT(*) as count FROM posts WHERE created_at >= date('now')").get().count,
      suspended_users: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_suspended = 1').get().count,
      total_reports: db.prepare('SELECT COUNT(*) as count FROM reports').get().count
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// User management
router.get('/users', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = 'SELECT id, username, email, display_name, avatar, role, is_verified, is_suspended, storage_used, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params = [];
    const countParams = [];

    if (search) {
      const searchClause = ' WHERE username LIKE ? OR email LIKE ? OR display_name LIKE ?';
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const users = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams).count;

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Suspend user
router.put('/users/:id/suspend', (req, res) => {
  try {
    const { reason } = req.body;
    const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'super_admin') return res.status(403).json({ error: 'Cannot suspend super admin' });
    
    db.prepare('UPDATE users SET is_suspended = 1, suspension_reason = ? WHERE id = ?').run(reason || 'Suspended by admin', req.params.id);
    res.json({ message: 'User suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Unsuspend user
router.put('/users/:id/unsuspend', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_suspended = 0, suspension_reason = \'\' WHERE id = ?').run(req.params.id);
    res.json({ message: 'User unsuspended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'super_admin') return res.status(403).json({ error: 'Cannot delete super admin' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Post management
router.get('/posts', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Delete post (admin)
router.delete('/posts/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const media = db.prepare('SELECT f.* FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ?').all(req.params.id);

    db.prepare('DELETE FROM post_media WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM post_hashtags WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM likes WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM bookmarks WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);

    const orphans = db.prepare(`
      SELECT h.id FROM hashtags h
      WHERE (SELECT COUNT(*) FROM post_hashtags WHERE hashtag_id = h.id) = 0
    `).all();
    if (orphans.length > 0) {
      const ids = orphans.map(o => o.id);
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM hashtags WHERE id IN (${placeholders})`).run(...ids);
    }

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

// Reports
router.get('/reports', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = `
      SELECT r.*, u.username as reporter_username, 
        CASE WHEN r.reported_user_id IS NOT NULL THEN (SELECT username FROM users WHERE id = r.reported_user_id) ELSE NULL END as reported_username,
        CASE WHEN r.post_id IS NOT NULL THEN (SELECT content FROM posts WHERE id = r.post_id) ELSE NULL END as post_content
      FROM reports r JOIN users u ON r.reporter_id = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const reports = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as count FROM reports ${status ? 'WHERE status = ?' : ''}`).get(...(status ? [status] : [])).count;

    res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Resolve report
router.put('/reports/:id', (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE reports SET status = ?, admin_notes = ?, resolved_at = datetime(\'now\') WHERE id = ?')
      .run(status, adminNotes || '', req.params.id);
    res.json({ message: 'Report updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Storage monitoring
router.get('/storage', (req, res) => {
  try {
    const totalUsed = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM files').get().total;
    const totalFiles = db.prepare('SELECT COUNT(*) as count FROM files').get().count;
    
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(file_size) as size
      FROM files GROUP BY category
    `).all();

    const topUsers = db.prepare(`
      SELECT id, username, storage_used, storage_limit
      FROM users ORDER BY storage_used DESC LIMIT 20
    `).all();

    res.json({ total_used: totalUsed, total_files: totalFiles, by_category: byCategory, top_users: topUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

module.exports = router;
