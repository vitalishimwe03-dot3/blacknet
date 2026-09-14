const router = require('express').Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const xss = require('xss');

router.post('/', requireAuth, async (req, res) => {
  try {
    const { reportedUserId, targetType, targetId, reason, description } = req.body;
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, target_type, target_id, reason, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.session.userId, reportedUserId, targetType, targetId, reason, xss(description || '')]
    );
    res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.username as reporter_username, ru.username as reported_username
       FROM reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN users ru ON r.reported_user_id = ru.id
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC`,
      [req.session.userId]
    );
    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

module.exports = router;
