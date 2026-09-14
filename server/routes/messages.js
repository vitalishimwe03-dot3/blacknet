const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware');

// Get conversations
router.get('/conversations', authMiddleware, (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT m.*, 
        CASE WHEN m.sender_id = ? THEN u2.username ELSE u1.username END as other_username,
        CASE WHEN m.sender_id = ? THEN u2.display_name ELSE u1.display_name END as other_display_name,
        CASE WHEN m.sender_id = ? THEN u2.avatar ELSE u1.avatar END as other_avatar
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE m.id IN (
        SELECT MAX(id) FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
      )
      ORDER BY m.created_at DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

    // Get unread counts
    const enriched = conversations.map(conv => {
      const otherId = conv.sender_id === req.user.id ? conv.receiver_id : conv.sender_id;
      const unread = db.prepare('SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').get(otherId, req.user.id).count;
      const user = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE id = ?').get(otherId);
      return { ...conv, unread_count: unread, other_user: user };
    });

    res.json({ conversations: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages with a user
router.get('/:userId', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    const otherUser = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE id = ?').get(req.params.userId);
    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    const messages = db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `).all(req.user.id, req.params.userId, req.params.userId, req.user.id, limit, offset);

    // Mark as read
    db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0')
      .run(req.params.userId, req.user.id);

    res.json({ messages: messages.reverse(), other_user: otherUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/:userId', authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
    if (content.length > 5000) return res.status(400).json({ error: 'Message too long' });

    const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const id = uuidv4();
    db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)')
      .run(id, req.user.id, req.params.userId, content.trim());

    db.prepare('INSERT INTO notifications (id, user_id, from_user_id, type, content) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), req.params.userId, req.user.id, 'message', content.trim().slice(0, 100));

    const message = db.prepare('SELECT m.*, u.username, u.display_name, u.avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?').get(id);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete single message
router.delete('/:userId/:messageId', authMiddleware, (req, res) => {
  try {
    const message = db.prepare('SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)').get(req.params.messageId, req.user.id, req.user.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.messageId);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Typing indicator
router.post('/:userId/typing', authMiddleware, (req, res) => {
  try {
    const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });
    res.json({ typing: true, userId: req.user.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// Get online status of users
router.post('/online-status', authMiddleware, (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) return res.json({ statuses: {} });

    const statuses = {};
    userIds.forEach(id => {
      const user = db.prepare('SELECT id, last_seen FROM users WHERE id = ?').get(id);
      if (user) {
        const lastSeen = new Date(user.last_seen + 'Z');
        const now = new Date();
        statuses[id] = {
          online: (now - lastSeen) < 5 * 60 * 1000,
          last_seen: user.last_seen
        };
      }
    });
    res.json({ statuses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch online status' });
  }
});

// Delete conversation
router.delete('/:userId', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)')
      .run(req.user.id, req.params.userId, req.params.userId, req.user.id);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
