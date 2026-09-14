const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, JWT_SECRET, JWT_EXPIRY } = require('../middleware');

// Register
router.post('/register', (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    
    db.prepare(`INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)`)
      .run(id, username, email, passwordHash, displayName || username);

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const user = db.prepare('SELECT id, username, email, display_name, avatar, role, storage_used, storage_limit FROM users WHERE id = ?').get(id);
    
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { login, password } = req.body;
    
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account is suspended: ' + user.suspension_reason });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`SELECT id, username, email, display_name, bio, avatar, cover_image, role, is_verified, storage_used, storage_limit, created_at 
    FROM users WHERE id = ?`).get(req.user.id);
  
  const followers = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(req.user.id).count;
  const following = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(req.user.id).count;
  const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(req.user.id).count;
  
  res.json({ ...user, followers_count: followers, following_count: following, posts_count: postsCount });
});

// Forgot password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      const resetToken = jwt.sign({ userId: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
      db.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE id = ?').run(user.id);
      // In production, send email with resetToken
      res.json({ message: 'If an account exists with this email, a reset link has been sent', resetToken });
    } else {
      res.json({ message: 'If an account exists with this email, a reset link has been sent' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'reset') return res.status(400).json({ error: 'Invalid token' });
    
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, decoded.userId);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
