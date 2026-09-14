const pool = require('../config/db');
const xss = require('xss');

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

exports.getChannels = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ch.id, ch.name, ch.slug, ch.description, ch.topic, ch.is_public, ch.created_by, ch.created_at,
        COALESCE(cm.member_count, 0) as member_count,
        COALESCE(act.active_count, 0) as active_count,
        MAX(CASE WHEN cml.user_id = $1 THEN 1 ELSE 0 END) as is_member
       FROM channels ch
       LEFT JOIN (SELECT channel_id, COUNT(*) member_count FROM channel_members GROUP BY channel_id) cm
         ON cm.channel_id = ch.id
       LEFT JOIN (SELECT channel_id, COUNT(*) active_count FROM channel_messages
         WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY channel_id) act
         ON act.channel_id = ch.id
       LEFT JOIN channel_members cml ON cml.channel_id = ch.id
       GROUP BY ch.id, cm.member_count, act.active_count
       ORDER BY ch.created_at DESC`,
      [req.session.userId]
    );
    res.json({ channels: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

exports.createChannel = async (req, res) => {
  try {
    const { name, description, topic, isPublic } = req.body;
    const slug = toSlug(name);

    const existing = await pool.query('SELECT id FROM channels WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Channel name already taken' });

    const result = await pool.query(
      `INSERT INTO channels (name, slug, description, topic, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [xss(name), slug, xss(description || ''), xss(topic || ''), isPublic !== false, req.session.userId]
    );

    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [result.rows[0].id, req.session.userId]
    );

    res.status(201).json({ channel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

exports.joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [channelId, req.session.userId]
    );

    const io = req.app.get('io');
    const user = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
    io.to(`channel:${channelId}`).emit('user_joined', { userId: req.session.userId, username: user.rows[0].username });

    // System message
    await pool.query(
      `INSERT INTO channel_messages (channel_id, sender_id, content, type)
       VALUES ($1, $2, $3, 'system')`,
      [channelId, req.session.userId, `${user.rows[0].username} joined the channel`]
    );

    res.json({ message: 'Joined channel' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

exports.leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const user = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);

    await pool.query(
      `INSERT INTO channel_messages (channel_id, sender_id, content, type)
       VALUES ($1, $2, $3, 'system')`,
      [channelId, req.session.userId, `${user.rows[0].username} left the channel`]
    );

    await pool.query('DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2', [channelId, req.session.userId]);

    const io = req.app.get('io');
    io.to(`channel:${channelId}`).emit('user_left', { userId: req.session.userId, username: user.rows[0].username });

    res.json({ message: 'Left channel' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave channel' });
  }
};

exports.getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { before, limit = 100 } = req.query;

    let query = `
      SELECT cm.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar
      FROM channel_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.channel_id = $1 AND cm.is_deleted = false
    `;
    const params = [channelId];

    if (before) {
      query += ` AND cm.created_at < (SELECT created_at FROM channel_messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendChannelMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, command } = req.body;

    if (command) {
      return exports.handleCommand(req, res, channelId, command);
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if muted
    const memberCheck = await pool.query(
      'SELECT is_muted FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, req.session.userId]
    );
    if (memberCheck.rows.length > 0 && memberCheck.rows[0].is_muted) {
      return res.status(403).json({ error: 'You are muted in this channel' });
    }

    const result = await pool.query(
      `INSERT INTO channel_messages (channel_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [channelId, req.session.userId, xss(content.trim())]
    );

    const io = req.app.get('io');
    io.to(`channel:${channelId}`).emit('channel_message', result.rows[0]);

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.handleCommand = async (req, res, channelId, command) => {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  try {
    switch (cmd) {
      case '/mute': {
        if (parts.length < 2) return res.status(400).json({ error: 'Usage: /mute @username' });
        const target = await pool.query('SELECT id FROM users WHERE username = $1', [parts[1].replace('@', '')]);
        if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        await pool.query(
          'UPDATE channel_members SET is_muted = true WHERE channel_id = $1 AND user_id = $2',
          [channelId, target.rows[0].id]
        );
        res.json({ message: `User muted`, type: 'system' });
        break;
      }
      case '/unmute': {
        const target = await pool.query('SELECT id FROM users WHERE username = $1', [parts[1].replace('@', '')]);
        if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        await pool.query(
          'UPDATE channel_members SET is_muted = false WHERE channel_id = $1 AND user_id = $2',
          [channelId, target.rows[0].id]
        );
        res.json({ message: `User unmuted`, type: 'system' });
        break;
      }
      case '/topic': {
        const topic = parts.slice(1).join(' ');
        await pool.query('UPDATE channels SET topic = $1 WHERE id = $2', [xss(topic), channelId]);
        res.json({ message: 'Topic updated', type: 'system' });
        break;
      }
      case '/help': {
        res.json({
          message: 'Available commands: /join, /leave, /mute, /unmute, /topic, /who, /help',
          type: 'help'
        });
        break;
      }
      case '/who': {
        const members = await pool.query(
          `SELECT u.username, u.is_online FROM channel_members cm
           JOIN users u ON cm.user_id = u.id WHERE cm.channel_id = $1`,
          [channelId]
        );
        res.json({ message: `Members: ${members.rows.map(m => m.username).join(', ')}`, type: 'who' });
        break;
      }
      default:
        res.status(400).json({ error: 'Unknown command. Type /help for available commands.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Command failed' });
  }
};

exports.muteUser = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    await pool.query('UPDATE channel_members SET is_muted = true WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    res.json({ message: 'User muted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mute user' });
  }
};

exports.kickUser = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    await pool.query('DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    res.json({ message: 'User kicked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to kick user' });
  }
};
