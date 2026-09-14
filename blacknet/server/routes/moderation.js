const router = require('express').Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const xss = require('xss');

router.get('/reports', requireAuth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT r.*, u.username as reporter_username, ru.username as reported_username, ru.email as reported_email
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN users ru ON r.reported_user_id = ru.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE r.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY r.created_at DESC LIMIT 100`;
    const result = await pool.query(query, params);
    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.put('/reports/:reportId', requireAuth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    const result = await pool.query(
      `UPDATE reports SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, req.session.userId, xss(reviewNotes || ''), req.params.reportId]
    );
    res.json({ report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT usr.id, usr.username, usr.email, usr.display_name, usr.role, usr.is_online, usr.created_at,
        COALESCE(rc.report_count, 0) as report_count
       FROM users usr
       LEFT JOIN (SELECT reported_user_id, COUNT(*) report_count FROM reports GROUP BY reported_user_id) rc
         ON rc.reported_user_id = usr.id
       ORDER BY usr.created_at DESC LIMIT 100`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:userId/role', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.userId]);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
       VALUES ($1, 'role_change', 'user', $2, $3)`,
      [req.session.userId, req.params.userId, JSON.stringify({ newRole: role })]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:userId/ban', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      ['00000000-0000-0000-0000-000000000000', req.params.userId]
    );
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id)
       VALUES ($1, 'user_ban', 'user', $2)`,
      [req.session.userId, req.params.userId]
    );
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.get('/audit', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.username as admin_username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 200`
    );
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/stats', requireAuth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const [users, messages, reports, channels, forums, communities] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM messages'),
      pool.query(`SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`),
      pool.query('SELECT COUNT(*) as count FROM channels'),
      pool.query('SELECT COUNT(*) as count FROM forums'),
      pool.query('SELECT COUNT(*) as count FROM communities'),
    ]);
    res.json({
      stats: {
        users: parseInt(users.rows[0].count),
        messages: parseInt(messages.rows[0].count),
        pendingReports: parseInt(reports.rows[0].count),
        channels: parseInt(channels.rows[0].count),
        forums: parseInt(forums.rows[0].count),
        communities: parseInt(communities.rows[0].count),
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
