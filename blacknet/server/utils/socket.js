const pool = require('../config/db');

// userId -> { socketIds: Set<string> }
const onlineUsers = new Map();

function emitNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    let userId = null;

    socket.on('authenticate', async (sessionUserId) => {
      if (!sessionUserId) return;
      userId = sessionUserId;

      const entry = onlineUsers.get(userId) || { socketIds: new Set() };
      entry.socketIds.add(socket.id);
      onlineUsers.set(userId, entry);
      socket.join(`user:${userId}`);

      try {
        await pool.query('UPDATE users SET is_online = true, last_seen_at = NOW() WHERE id = $1', [userId]);
        io.emit('user_status', { userId, isOnline: true });
      } catch (err) {
        console.error('Socket authenticate db error:', err);
      }
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

    socket.on('join_chat_room', (roomId) => {
      socket.join(`chatroom:${roomId}`);
    });

    socket.on('leave_chat_room', (roomId) => {
      socket.leave(`chatroom:${roomId}`);
    });

    socket.on('typing', ({ conversationId, username }) => {
      if (!userId) return;
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId, username });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!userId) return;
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { userId });
    });

    socket.on('channel_typing', ({ channelId, username }) => {
      if (!userId) return;
      socket.to(`channel:${channelId}`).emit('channel_user_typing', { userId, username, isTyping: true });
    });

    socket.on('channel_stop_typing', ({ channelId }) => {
      if (!userId) return;
      socket.to(`channel:${channelId}`).emit('channel_user_typing', { userId, isTyping: false });
    });

    socket.on('chat_room_typing', ({ roomId, displayName }) => {
      socket.to(`chatroom:${roomId}`).emit('chat_room_user_typing', { roomId, displayName, isTyping: true });
    });

    socket.on('chat_room_stop_typing', ({ roomId }) => {
      socket.to(`chatroom:${roomId}`).emit('chat_room_user_typing', { roomId, isTyping: false });
    });

    socket.on('disconnect', async () => {
      if (!userId) return;
      const entry = onlineUsers.get(userId);
      if (entry) {
        entry.socketIds.delete(socket.id);
        if (entry.socketIds.size === 0) {
          onlineUsers.delete(userId);
          try {
            await pool.query('UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1', [userId]);
            io.emit('user_status', { userId, isOnline: false });
          } catch (err) {
            console.error('Socket disconnect db error:', err);
          }
        }
      }
    });
  });
}

module.exports = setupSocket;
module.exports.emitNotification = emitNotification;
module.exports.onlineUsers = onlineUsers;