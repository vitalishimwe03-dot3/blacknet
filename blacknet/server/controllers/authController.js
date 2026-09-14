const argon2 = require('argon2');
const validator = require('validator');
const xss = require('xss');
const pool = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-50 chars, alphanumeric with _ or -' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id, username, email, display_name, role, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, xss(displayName || username)]
    );

    const user = result.rows[0];
    req.session.userId = user.id;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, details) VALUES ($1, 'register', $2)`,
      [user.id, JSON.stringify({ username: user.username })]
    );

    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, email, password_hash, display_name, avatar_url, role FROM users WHERE username = $1 OR email = $1',
      [login.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await argon2.verify(user.password_hash, password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;

    await pool.query('UPDATE users SET is_online = true, last_seen_at = NOW() WHERE id = $1', [user.id]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, 'login', $2, $3)`,
      [user.id, req.ip, JSON.stringify({ username: user.username })]
    );

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.session.userId) {
      await pool.query('UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1', [req.session.userId]);
      await pool.query(
        `INSERT INTO audit_logs (user_id, action) VALUES ($1, 'logout')`,
        [req.session.userId]
      );
    }
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, bio, role, is_online, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const valid = await argon2.verify(result.rows[0].password_hash, currentPassword);

    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await argon2.hash(newPassword);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.session.userId]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action) VALUES ($1, 'password_change')`,
      [req.session.userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
};
