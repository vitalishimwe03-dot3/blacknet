const pool = require('../config/db');
const xss = require('xss');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_url, bio, role, is_online, last_seen_at, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const result = await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name), bio = COALESCE($2, bio),
       avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4 RETURNING id, username, email, display_name, avatar_url, bio, role`,
      [displayName ? xss(displayName) : null, bio ? xss(bio) : null, avatarUrl, req.session.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, is_online FROM users
       WHERE username ILIKE $1 OR display_name ILIKE $1 LIMIT 20`,
      [`%${q}%`]
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.session.userId, userId]
    );
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block user' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.session.userId, userId]
    );
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

exports.getOnlineUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE is_online = true LIMIT 100'
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
};
