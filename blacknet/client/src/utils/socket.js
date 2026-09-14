import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/auth'
import { useMessagesStore } from '../stores/messages'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] })
    socket.on('connect', () => {
      const auth = useAuthStore()
      if (auth.user) {
        socket.emit('authenticate', auth.user.id)
      }
    })
    socket.on('new_message', (message) => {
      const messages = useMessagesStore()
      messages.addRealtimeMessage(message)
    })
    socket.on('user_typing', ({ userId }) => {
      const messages = useMessagesStore()
      messages.setTyping(userId, true)
      setTimeout(() => messages.setTyping(userId, false), 3000)
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
