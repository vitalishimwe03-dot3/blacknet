<template>
  <div class="flex h-full">
    <!-- Channel sidebar -->
    <div class="w-64 border-r border-bn-border flex flex-col flex-shrink-0 bg-bn-dark/50">
      <div class="p-4 border-b border-bn-border">
        <h2 class="font-semibold text-bn-text font-mono text-sm text-gradient"># {{ channel?.name || 'Loading...' }}</h2>
        <p v-if="channel?.topic" class="text-xs text-bn-muted mt-1">{{ channel.topic }}</p>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-1">
        <button v-for="ch in allChannels" :key="ch.id"
          class="w-full text-left p-2 rounded-lg text-sm font-mono transition-colors"
          :class="ch.id === channelId ? 'bg-bn-accent/10 text-bn-accent' : 'text-bn-muted hover:text-bn-text hover:bg-bn-surface/50'"
          @click="switchChannel(ch)"
        >
          # {{ ch.name }}
        </button>
      </div>
      <div class="p-3 border-t border-bn-border">
        <button @click="leaveChannel" class="btn-danger w-full font-mono text-xs">Leave Channel</button>
      </div>
    </div>

    <!-- Chat area -->
    <div class="flex-1 flex flex-col">
      <div ref="msgContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-for="msg in messages" :key="msg.id">
          <div v-if="msg.type === 'system'" class="text-center py-2">
            <span class="text-xs text-bn-muted font-mono bg-bn-surface/50 px-3 py-1 rounded-full">{{ msg.content }}</span>
          </div>
          <div v-else class="flex gap-3 hover:bg-bn-surface/20 p-2 -mx-2 rounded-lg transition-colors">
            <div class="w-8 h-8 rounded-full bg-bn-surface flex items-center justify-center text-[10px] font-mono text-bn-accent border border-bn-border flex-shrink-0">
              {{ getInitials(msg.sender_display_name || msg.sender_username || '?') }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-bn-text">{{ msg.sender_display_name || msg.sender_username }}</span>
                <span class="text-[10px] text-bn-muted font-mono">{{ formatShortTime(msg.created_at) }}</span>
              </div>
              <p class="text-sm text-bn-text mt-0.5">{{ msg.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-bn-border">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <input v-model="input" class="input flex-1 font-mono text-sm" :placeholder="`Message #${channel?.name || 'channel'}...`" />
          <button type="submit" :disabled="!input.trim()" class="btn-primary font-mono text-sm px-5">Send</button>
        </form>
        <p class="text-[10px] text-bn-muted/50 font-mono mt-1">Commands: /join /leave /mute @user /topic [text] /who /help</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '../utils/socket'
import { getInitials, formatShortTime } from '../utils/helpers'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()
const channelId = route.params.channelId
const channel = ref(null)
const allChannels = ref([])
const messages = ref([])
const input = ref('')
const msgContainer = ref(null)

async function fetchData() {
  const [chRes, msgRes, allRes] = await Promise.all([
    api.get('/channels'),
    api.get(`/channels/${channelId}/messages`),
    api.get('/channels')
  ])
  channel.value = chRes.data.channels.find(c => c.id === channelId)
  if (!channel.value?.is_member) {
    await api.post(`/channels/${channelId}/join`)
    channel.value.is_member = true
  }
  messages.value = msgRes.data.messages
  allChannels.value = allRes.data.channels
  scrollToBottom()
}

function switchChannel(ch) {
  router.push(`/channels/${ch.id}`)
}

async function sendMessage() {
  if (!input.value.trim()) return

  // Handle commands
  if (input.value.startsWith('/')) {
    const { data } = await api.post(`/channels/${channelId}/messages`, { command: input.value })
    if (data.type === 'help' || data.type === 'who') {
      messages.value.push({
        id: Date.now().toString(),
        type: 'system',
        content: data.message,
        created_at: new Date().toISOString()
      })
    } else {
      messages.value.push({
        id: Date.now().toString(),
        type: 'system',
        content: data.message,
        sender_username: 'system',
        created_at: new Date().toISOString()
      })
    }
    input.value = ''
    scrollToBottom()
    return
  }

  const { data } = await api.post(`/channels/${channelId}/messages`, { content: input.value })
  messages.value.push(data.message)
  input.value = ''
  scrollToBottom()
}

async function leaveChannel() {
  await api.post(`/channels/${channelId}/leave`)
  router.push('/channels')
}

function scrollToBottom() {
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  })
}

onMounted(() => {
  fetchData()
  const socket = getSocket()
  socket.emit('join_channel', channelId)
  socket.on('channel_message', (msg) => {
    messages.value.push(msg)
    scrollToBottom()
  })
  socket.on('user_joined', (data) => {
    messages.value.push({
      id: Date.now().toString(),
      type: 'system',
      content: `${data.username} joined the channel`,
      created_at: new Date().toISOString()
    })
  })
})
</script>
