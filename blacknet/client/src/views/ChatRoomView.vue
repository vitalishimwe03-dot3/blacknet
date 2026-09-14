<template>
  <div class="flex h-full">
    <!-- Room sidebar -->
    <div class="w-64 border-r border-bn-border flex flex-col flex-shrink-0 bg-bn-dark/50">
      <div class="p-4 border-b border-bn-border">
        <h2 class="font-semibold text-bn-text font-mono text-sm text-gradient">&#9783; {{ room?.name || 'Loading...' }}</h2>
        <p v-if="room?.description" class="text-xs text-bn-muted mt-1">{{ room.description }}</p>
      </div>
      <div class="p-4 flex-1 overflow-y-auto">
        <div class="rounded-lg bg-bn-surface/50 border border-bn-accent/20 p-3">
          <p class="text-[10px] text-bn-muted font-mono uppercase tracking-widest mb-1">Your identity</p>
          <p class="text-sm font-mono font-semibold text-bn-accent">{{ anonName || 'Initializing...' }}</p>
          <p class="text-[10px] text-bn-muted font-mono mt-1">All messages appear under this pseudonym. Identity is randomized per room.</p>
        </div>
        <div class="mt-4 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-bn-muted">Online</span>
            <span class="text-bn-green" id="room-online-count">{{ onlineCount }}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-bn-muted">Messages</span>
            <span class="text-bn-text">{{ messages.length }}</span>
          </div>
        </div>
      </div>
      <div class="p-3 border-t border-bn-border">
        <button @click="leaveRoom" class="btn-danger w-full font-mono text-xs">Leave Room</button>
      </div>
    </div>

    <!-- Chat area -->
    <div class="flex-1 flex flex-col">
      <div ref="msgContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
        <ChannelMessage v-for="msg in messages" :key="msg.id" :message="msg" />
        <div v-if="typingNames.length" class="text-xs text-bn-muted font-mono italic">
          {{ typingNames.join(', ') }} {{ typingNames.length > 1 ? 'are' : 'is' }} typing...
        </div>
      </div>

      <div class="p-4 border-t border-bn-border">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <input v-model="input" class="input flex-1 font-mono text-sm" :placeholder="`Message as ${anonName}...`" @input="onTyping" />
          <button type="submit" :disabled="!input.trim()" class="btn-primary font-mono text-sm px-5">Send</button>
        </form>
        <p class="text-[10px] text-bn-muted/50 font-mono mt-1">Messages are anonymous and placeholder-encrypted. Do not send sensitive data.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '../utils/socket'
import api from '../utils/api'
import ChannelMessage from '../components/channels/ChannelMessage.vue'

const route = useRoute()
const router = useRouter()
const roomId = route.params.roomId
const room = ref(null)
const messages = ref([])
const input = ref('')
const anonName = ref('')
const msgContainer = ref(null)
const typing = ref({})
let typingTimer = null

const typingNames = computed(() => Object.values(typing.value).filter(Boolean))
const onlineCount = computed(() => new Set(messages.value.map(m => m.anon_name)).size)

async function fetchData() {
  const [roomsRes, msgRes] = await Promise.all([
    api.get('/chat-rooms'),
    api.get(`/chat-rooms/${roomId}/messages`),
  ])
  room.value = roomsRes.data.rooms.find(r => r.id === roomId)
  messages.value = msgRes.data.messages
  anonName.value = msgRes.data.anonName
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  })
}

async function sendMessage() {
  if (!input.value.trim()) return
  const { data } = await api.post(`/chat-rooms/${roomId}/messages`, { content: input.value })
  messages.value.push(data.message)
  input.value = ''
  getSocket().emit('chat_room_stop_typing', { roomId })
  scrollToBottom()
}

function onTyping() {
  getSocket().emit('chat_room_typing', { roomId, displayName: anonName.value })
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    getSocket().emit('chat_room_stop_typing', { roomId })
  }, 2000)
}

async function leaveRoom() {
  await api.post(`/chat-rooms/${roomId}/leave`)
  getSocket().emit('leave_chat_room', roomId)
  router.push('/chat-rooms')
}

let onMsg, onTypingEvent

onMounted(() => {
  fetchData()
  const socket = getSocket()
  socket.emit('join_chat_room', roomId)

  onMsg = (msg) => {
    if (msg.room_id !== roomId) return
    messages.value.push(msg)
    scrollToBottom()
  }
  socket.on('chat_room_message', onMsg)

  onTypingEvent = ({ roomId: rid, displayName, isTyping }) => {
    if (rid !== roomId) return
    if (isTyping) typing.value[displayName] = displayName
    else delete typing.value[displayName]
  }
  socket.on('chat_room_user_typing', onTypingEvent)
})

onUnmounted(() => {
  clearTimeout(typingTimer)
  const socket = getSocket()
  socket.emit('leave_chat_room', roomId)
  if (onMsg) socket.off('chat_room_message', onMsg)
  if (onTypingEvent) socket.off('chat_room_user_typing', onTypingEvent)
})
</script>