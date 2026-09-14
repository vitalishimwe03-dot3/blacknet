const pool = require('../config/db');
const xss = require('xss');
const { v4: uuidv4 } = require('uuid');

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateAnonName() {
  const hex = uuidv4().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `Anon-${hex}`;
}

async function ensureParticipant(roomId, userId) {
  const existing = await pool.query(
    'SELECT id, anon_name FROM chat_room_participants WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE chat_room_participants SET last_seen_at = NOW() WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    return existing.rows[0];
  }
  const anonName = generateAnonName();
  const result = await pool.query(
    'INSERT INTO chat_room_participants (room_id, user_id, anon_name) VALUES ($1, $2, $3) RETURNING id, anon_name',
    [roomId, userId, anonName]
  );
  return result.rows[0];
}

exports.getRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.id, cr.name, cr.slug, cr.description, cr.is_active, cr.created_by, cr.created_at,
        COALESCE(pc.participant_count, 0) as participant_count,
        COALESCE(mc.message_count, 0) as message_count,
        COALESCE(act.active_count, 0) as online_count,
        MAX(CASE WHEN cp.user_id = $1 THEN 1 ELSE 0 END) as is_participant
       FROM chat_rooms cr
       LEFT JOIN (SELECT room_id, COUNT(*) participant_count FROM chat_room_participants GROUP BY room_id) pc
         ON pc.room_id = cr.id
       LEFT JOIN (SELECT room_id, COUNT(*) message_count FROM chat_room_messages GROUP BY room_id) mc
         ON mc.room_id = cr.id
       LEFT JOIN (SELECT room_id, COUNT(*) active_count FROM chat_room_participants
         WHERE last_seen_at > NOW() - INTERVAL '5 minutes' GROUP BY room_id) act
         ON act.room_id = cr.id
       LEFT JOIN chat_room_participants cp ON cp.room_id = cr.id AND cp.user_id = $1
       WHERE cr.is_active = true
       GROUP BY cr.id, pc.participant_count, mc.message_count, act.active_count
       ORDER BY mc.message_count DESC NULLS LAST`,
      [req.session.userId]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    const slug = toSlug(name);
    const existing = await pool.query('SELECT id FROM chat_rooms WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Room name already taken' });
    }

    const result = await pool.query(
      `INSERT INTO chat_rooms (name, slug, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [xss(name.trim()), slug, xss(description || ''), req.session.userId]
    );

    await ensureParticipant(result.rows[0].id, req.session.userId);

    res.status(201).json({ room: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before, limit = 50 } = req.query;

    const participant = await ensureParticipant(roomId, req.session.userId);

    let query = `
      SELECT crm.*, cp.anon_name
      FROM chat_room_messages crm
      JOIN chat_room_participants cp ON crm.participant_id = cp.id
      WHERE crm.room_id = $1 AND crm.is_deleted = false
    `;
    const params = [roomId];

    if (before) {
      query += ` AND crm.created_at < (SELECT created_at FROM chat_room_messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` ORDER BY crm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      messages: result.rows.reverse(),
      anonName: participant.anon_name
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const participant = await ensureParticipant(roomId, req.session.userId);

    const result = await pool.query(
      `INSERT INTO chat_room_messages (room_id, participant_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [roomId, participant.id, xss(content.trim())]
    );

    const message = { ...result.rows[0], anon_name: participant.anon_name };

    const io = req.app.get('io');
    io.to(`chatroom:${roomId}`).emit('chat_room_message', message);

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    await pool.query(
      'DELETE FROM chat_room_participants WHERE room_id = $1 AND user_id = $2',
      [roomId, req.session.userId]
    );
    res.json({ message: 'Left room' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
};