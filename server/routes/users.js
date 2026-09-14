const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'covers');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Avatar must be an image'), false);
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Cover must be an image'), false);
  }
});

// Get user profile
router.get('/:username', optionalAuth, (req, res) => {
  try {
    const user = db.prepare(`SELECT id, username, display_name, bio, avatar, cover_image, role, is_verified, created_at
      FROM users WHERE username = ?`).get(req.params.username);
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followers = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(user.id).count;
    const following = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(user.id).count;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;

    let isFollowing = false;
    if (req.user) {
      isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
    }

    res.json({ ...user, followers_count: followers, following_count: following, posts_count: postsCount, is_following: isFollowing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user's posts
router.get('/:username/posts', optionalAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    let visClause = "p.visibility = 'public'";
    const params = [user.id, limit, offset];
    if (req.user && req.user.id === user.id) {
      visClause = "1=1";
      params.length = 0;
      params.push(user.id, limit, offset);
    } else if (req.user) {
      const isFollow = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
      if (isFollow) {
        visClause = "p.visibility IN ('public', 'followers')";
      }
      params.length = 0;
      params.push(user.id, limit, offset);
    } else {
      params.length = 0;
      params.push(user.id, limit, offset);
    }

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND ${visClause}
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `).all(...params);

    const total = db.prepare(`SELECT COUNT(*) as count FROM posts p WHERE p.user_id = ? AND ${visClause}`).get(user.id).count;

    // Enrich posts
    const enrichedPosts = posts.map(post => {
      const media = db.prepare('SELECT pm.*, f.* FROM post_media pm JOIN files f ON pm.file_id = f.id WHERE pm.post_id = ? ORDER BY pm.order_index').all(post.id);
      const likesCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(post.id).count;
      let isLiked = false;
      let isBookmarked = false;
      if (req.user) {
        isLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
        isBookmarked = !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id);
      }
      const hashtags = db.prepare('SELECT h.name FROM post_hashtags ph JOIN hashtags h ON ph.hashtag_id = h.id WHERE ph.post_id = ?').all(post.id).map(h => h.name);
      return { ...post, media, likes_count: likesCount, is_liked: isLiked, is_bookmarked: isBookmarked, hashtags };
    });

    res.json({ posts: enrichedPosts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Update profile
router.put('/me/profile', authMiddleware, (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const updates = [];
    const params = [];
    
    if (displayName !== undefined) {
      if (displayName.length > 50) return res.status(400).json({ error: 'Display name too long' });
      updates.push('display_name = ?');
      params.push(displayName);
    }
    if (bio !== undefined) {
      if (bio.length > 500) return res.status(400).json({ error: 'Bio too long' });
      updates.push('bio = ?');
      params.push(bio);
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    
    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);
    
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    const user = db.prepare('SELECT id, username, email, display_name, bio, avatar, cover_image, role, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user stats
router.get('/:username/stats', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;
    const likes = db.prepare('SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = ?').get(user.id).count;
    
    res.json({ posts, likes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Upload avatar
router.post('/me/avatar', authMiddleware, uploadAvatar.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const oldUser = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
    if (oldUser.avatar) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, 'avatars', oldUser.avatar)); } catch (e) {}
    }

    const filename = req.file.filename;
    db.prepare("UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?").run(filename, req.user.id);
    res.json({ avatar: filename });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Upload cover
router.post('/me/cover', authMiddleware, uploadCover.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const oldUser = db.prepare('SELECT cover_image FROM users WHERE id = ?').get(req.user.id);
    if (oldUser.cover_image) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, 'covers', oldUser.cover_image)); } catch (e) {}
    }

    const filename = req.file.filename;
    db.prepare("UPDATE users SET cover_image = ?, updated_at = datetime('now') WHERE id = ?").run(filename, req.user.id);
    res.json({ cover_image: filename });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: 'Failed to upload cover' });
  }
});

// Change password
router.put('/me/password', authMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user.id);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Report user
router.post('/report', authMiddleware, (req, res) => {
  try {
    const { userId, reason, description } = req.body;
    if (!userId || !reason) return res.status(400).json({ error: 'User ID and reason required' });
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot report yourself' });

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO reports (id, reporter_id, reported_user_id, reason, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, userId, reason, description || '');

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large' });
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('image')) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
