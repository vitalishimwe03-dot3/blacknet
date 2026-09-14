const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware');

// Follow/unfollow
router.post('/:username', authMiddleware, (req, res) => {
  try {
    const target = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id);

    if (existing) {
      db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
      res.json({ following: false });
    } else {
      db.prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, target.id);
      db.prepare('INSERT INTO notifications (id, user_id, from_user_id, type) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), target.id, req.user.id, 'follow');
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process follow' });
  }
});

// Get followers
router.get('/:username/followers', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ? ORDER BY f.created_at DESC
    `).all(user.id);

    res.json({ followers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get following
router.get('/:username/following', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const following = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar, u.bio, f.created_at as followed_at
      FROM follows f JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ? ORDER BY f.created_at DESC
    `).all(user.id);

    res.json({ following });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

module.exports = router;
