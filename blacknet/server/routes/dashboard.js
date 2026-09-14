const router = require('express').Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [onlineUsersRes, channelsRes, threadsRes, postsRes, communitiesRes, unreadNotifRes, unreadMsgRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_online = true'),
      pool.query('SELECT COUNT(*) as count FROM channels'),
      pool.query('SELECT COUNT(*) as count FROM forum_threads'),
      pool.query('SELECT COUNT(*) as count FROM forum_posts'),
      pool.query('SELECT COUNT(*) as count FROM communities'),
      pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
       pool.query(
        `SELECT COUNT(*) as count FROM messages m
         JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
         LEFT JOIN message_read_status rs ON rs.message_id = m.id AND rs.user_id = $1
         WHERE m.sender_id != $1 AND m.is_deleted = false AND rs.id IS NULL`,
        [userId]
      ),
    ]);

    res.json({
      stats: {
        onlineUsers: parseInt(onlineUsersRes.rows[0].count),
        channels: parseInt(channelsRes.rows[0].count),
        forumThreads: parseInt(threadsRes.rows[0].count),
        forumPosts: parseInt(postsRes.rows[0].count),
        communities: parseInt(communitiesRes.rows[0].count),
        unreadNotifications: parseInt(unreadNotifRes.rows[0].count),
        unreadMessages: parseInt(unreadMsgRes.rows[0].count),
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;