import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/auth'
import { useMessagesStore } from '../stores/messages'
import { useNotificationStore } from '../stores/notifications'
import { usePresenceStore } from '../stores/presence'

let socket = null
let bound = false

function bindListeners() {
  if (bound) return
  bound = true

  socket.on('connect', () => {
    const auth = useAuthStore()
    if (auth.user) {
      socket.emit('authenticate', auth.user.id)
    }
  })

  socket.on('new_message', (message) => {
    useMessagesStore().addRealtimeMessage(message)
  })

  socket.on('message_edited', (message) => {
    useMessagesStore().applyMessageEdit(message)
  })

  socket.on('message_deleted', ({ messageId }) => {
    useMessagesStore().applyMessageDelete(messageId)
  })

  socket.on('user_typing', ({ userId, username }) => {
    const messages = useMessagesStore()
    if (messages.currentConversation) {
      messages.setTyping(messages.currentConversation, userId, username, true)
    }
  })

  socket.on('user_stop_typing', ({ userId }) => {
    const messages = useMessagesStore()
    if (messages.currentConversation) {
      messages.setTyping(messages.currentConversation, userId, null, false)
    }
  })

  socket.on('notification', (notification) => {
    useNotificationStore().pushNotification(notification)
  })

  socket.on('user_status', ({ userId, isOnline }) => {
    usePresenceStore().setOnline(userId, isOnline)
  })
}

export function getSocket() {
  if (!socket) {
    socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] })
    bindListeners()
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    bound = false
    socket.disconnect()
    socket = null
  }
}