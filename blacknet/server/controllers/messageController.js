const pool = require('../config/db');
const xss = require('xss');

exports.getConversations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.type, c.name, c.created_by, c.created_at, c.updated_at,
        lm.last_message, lm.last_message_at, COALESCE(lm.message_count, 0) as message_count
       FROM conversations c
       JOIN conversation_members mc ON c.id = mc.conversation_id AND mc.user_id = $1
       LEFT JOIN (
         SELECT conversation_id,
           (array_agg(content ORDER BY created_at DESC))[1] as last_message,
           (array_agg(created_at ORDER BY created_at DESC))[1] as last_message_at,
           COUNT(*) as message_count
         FROM messages WHERE is_deleted = false GROUP BY conversation_id
       ) lm ON lm.conversation_id = c.id
       ORDER BY lm.last_message_at DESC NULLS LAST`,
      [req.session.userId]
    );
    res.json({ conversations: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;

    if (type === 'direct' && memberIds && memberIds.length === 1) {
      const existing = await pool.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = $1
         JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = $2
         WHERE c.type = 'direct'`,
        [req.session.userId, memberIds[0]]
      );
      if (existing.rows.length > 0) {
        return res.json({ conversation: { id: existing.rows[0].id } });
      }
    }

    const result = await pool.query(
      `INSERT INTO conversations (type, name, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [type || 'group', xss(name || ''), req.session.userId]
    );
    const conversation = result.rows[0];

    await pool.query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)`,
      [conversation.id, req.session.userId]
    );

    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await pool.query(
          `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [conversation.id, memberId]
        );
      }
    }

    res.status(201).json({ conversation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    let query = `
      SELECT m.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar,
        rm.id as reply_id, rm.content as reply_content, ru.username as reply_sender_username
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON rm.id = m.reply_to
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE m.conversation_id = $1
    `;
    const params = [conversationId];

    if (before) {
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` AND m.is_deleted = false ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Mark as read
    for (const msg of result.rows) {
      if (msg.sender_id !== req.session.userId) {
        await pool.query(
          `INSERT INTO message_read_status (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [msg.id, req.session.userId]
        );
      }
    }

    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type, replyTo } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const sanitizedContent = xss(content.trim());
    if (sanitizedContent.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
    }

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, type, reply_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, req.session.userId, sanitizedContent, type || 'text', replyTo || null]
    );

    const message = result.rows[0];

    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    const io = req.app.get('io');
    io.to(`conversation:${conversationId}`).emit('new_message', {
      ...message,
      sender_id: req.session.userId
    });

    // Notify offline members
    const members = await pool.query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2`,
      [conversationId, req.session.userId]
    );
    for (const member of members.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'message', 'New Message', $2, $3)`,
        [member.user_id, `New message in conversation`, `/messages/${conversationId}`]
      );
    }

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const check = await pool.query('SELECT sender_id FROM messages WHERE id = $1', [messageId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    if (check.rows[0].sender_id !== req.session.userId) return res.status(403).json({ error: 'Not authorized' });

    const result = await pool.query(
      `UPDATE messages SET content = $1, is_edited = true, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [xss(content), messageId]
    );

    const io = req.app.get('io');
    io.to(`conversation:${result.rows[0].conversation_id}`).emit('message_edited', result.rows[0]);

    res.json({ message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const check = await pool.query('SELECT sender_id, conversation_id FROM messages WHERE id = $1', [messageId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

    const userRole = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (check.rows[0].sender_id !== req.session.userId && !['admin', 'moderator'].includes(userRole.rows[0].role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query("UPDATE messages SET is_deleted = true, content = '[deleted]' WHERE id = $1", [messageId]);

    const io = req.app.get('io');
    io.to(`conversation:${check.rows[0].conversation_id}`).emit('message_deleted', { messageId });

    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const { q, conversationId } = req.query;
    if (!q || q.length < 2) return res.json({ messages: [] });

    let query = `
      SELECT m.*, u.username as sender_username, c.name as conversation_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_members cm ON c.id = cm.conversation_id
      WHERE m.content ILIKE $1 AND m.is_deleted = false AND cm.user_id = $2
    `;
    const params = [`%${q}%`, req.session.userId];

    if (conversationId) {
      query += ` AND m.conversation_id = $3`;
      params.push(conversationId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT 50`;
    const result = await pool.query(query, params);
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
};
