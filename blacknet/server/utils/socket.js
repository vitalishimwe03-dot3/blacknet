const pool = require('../config/db');

function setupSocket(io) {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    let userId = null;

    socket.on('authenticate', async (sessionUserId) => {
      userId = sessionUserId;
      onlineUsers.set(userId, socket.id);
      await pool.query('UPDATE users SET is_online = true WHERE id = $1', [userId]);
      io.emit('user_status', { userId, isOnline: true });
    });

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('join_channel', (channelId) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('typing', ({ conversationId, username }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId, username });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { userId });
    });

    socket.on('channel_typing', ({ channelId, username }) => {
      socket.to(`channel:${channelId}`).emit('channel_user_typing', { userId, username });
    });

    socket.on('disconnect', async () => {
      if (userId) {
        onlineUsers.delete(userId);
        await pool.query('UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1', [userId]);
        io.emit('user_status', { userId, isOnline: false });
      }
    });
  });
}

module.exports = setupSocket;
