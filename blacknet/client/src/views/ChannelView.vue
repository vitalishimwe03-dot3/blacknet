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
          class="w-full text-left p-2 rounded-lg text-sm font-mono transition-colors flex items-center gap-2"
          :class="ch.id === channelId ? 'bg-bn-accent/10 text-bn-accent' : 'text-bn-muted hover:text-bn-text hover:bg-bn-surface/50'"
          @click="switchChannel(ch)"
        >
          <span>#</span>
          <span class="truncate">{{ ch.name }}</span>
          <span v-if="ch.is_member" class="badge badge-accent text-[9px] ml-auto">&#10003;</span>
        </button>
      </div>
      <div class="p-3 border-t border-bn-border">
        <button @click="leaveChannel" class="btn-danger w-full font-mono text-xs">Leave Channel</button>
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
          <input v-model="input" class="input flex-1 font-mono text-sm" :placeholder="`Message #${channel?.name || 'channel'}...`" @input="onTyping" />
          <button type="submit" :disabled="!input.trim()" class="btn-primary font-mono text-sm px-5">Send</button>
        </form>
        <p class="text-[10px] text-bn-muted/50 font-mono mt-1">Commands: /join /leave /mute @user /topic [text] /who /help</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '../utils/socket'
import api from '../utils/api'
import { useAuthStore } from '../stores/auth'
import ChannelMessage from '../components/channels/ChannelMessage.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const channelId = computed(() => route.params.channelId)
const channel = ref(null)
const allChannels = ref([])
const messages = ref([])
const input = ref('')
const msgContainer = ref(null)
const typing = ref({})
let typingTimer = null

const typingNames = computed(() => Object.values(typing.value).filter(Boolean))

let onChannelMsg, onUserJoined, onUserLeft, onTypingEvent

function bindSocket() {
  const socket = getSocket()
  socket.emit('join_channel', channelId.value)

  onChannelMsg = (msg) => {
    if (msg.channel_id !== channelId.value) return
    messages.value.push(msg)
    scrollToBottom()
  }
  socket.on('channel_message', onChannelMsg)

  onUserJoined = (data) => {
    if (!data) return
    messages.value.push({
      id: `sys-${Date.now()}-${Math.random()}`,
      type: 'system',
      content: `${data.username} joined the channel`,
      created_at: new Date().toISOString()
    })
    scrollToBottom()
  }
  socket.on('user_joined', onUserJoined)

  onUserLeft = (data) => {
    if (!data) return
    messages.value.push({
      id: `sys-${Date.now()}-${Math.random()}`,
      type: 'system',
      content: `${data.username} left the channel`,
      created_at: new Date().toISOString()
    })
    scrollToBottom()
  }
  socket.on('user_left', onUserLeft)

  onTypingEvent = ({ userId, username, isTyping }) => {
    if (!userId || userId === auth.user?.id) return
    if (isTyping) typing.value[userId] = username
    else delete typing.value[userId]
  }
  socket.on('channel_user_typing', onTypingEvent)
}

function unbindSocket() {
  const socket = getSocket()
  socket.emit('leave_channel', channelId.value)
  if (onChannelMsg) socket.off('channel_message', onChannelMsg)
  if (onUserJoined) socket.off('user_joined', onUserJoined)
  if (onUserLeft) socket.off('user_left', onUserLeft)
  if (onTypingEvent) socket.off('channel_user_typing', onTypingEvent)
  onChannelMsg = onUserJoined = onUserLeft = onTypingEvent = null
}

async function fetchData() {
  const [chRes, msgRes, allRes] = await Promise.all([
    api.get('/channels'),
    api.get(`/channels/${channelId.value}/messages`),
    api.get('/channels')
  ])
  channel.value = chRes.data.channels.find(c => c.id === channelId.value)
  if (!channel.value?.is_member) {
    await api.post(`/channels/${channelId.value}/join`)
    channel.value.is_member = true
  }
  messages.value = msgRes.data.messages
  allChannels.value = allRes.data.channels
  scrollToBottom()
}

function switchChannel(ch) {
  if (ch.id === channelId.value) return
  router.push(`/channels/${ch.id}`)
}

async function sendMessage() {
  if (!input.value.trim()) return

  if (input.value.startsWith('/')) {
    const { data } = await api.post(`/channels/${channelId.value}/messages`, { command: input.value })
    messages.value.push({
      id: `cmd-${Date.now()}`,
      type: data.type || 'system',
      content: data.message,
      created_at: new Date().toISOString()
    })
    input.value = ''
    scrollToBottom()
    return
  }

  const { data } = await api.post(`/channels/${channelId.value}/messages`, { content: input.value })
  messages.value.push(data.message)
  input.value = ''
  getSocket().emit('channel_stop_typing', { channelId: channelId.value })
  scrollToBottom()
}

function onTyping() {
  getSocket().emit('channel_typing', { channelId: channelId.value, username: auth.user?.username })
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    getSocket().emit('channel_stop_typing', { channelId: channelId.value })
  }, 2000)
}

async function leaveChannel() {
  await api.post(`/channels/${channelId.value}/leave`)
  unbindSocket()
  router.push('/channels')
}

function scrollToBottom() {
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  })
}

watch(channelId, async () => {
  if (!channelId.value) return
  unbindSocket()
  typing.value = {}
  messages.value = []
  await fetchData()
  bindSocket()
})

onMounted(() => {
  fetchData()
  bindSocket()
})

onUnmounted(() => {
  clearTimeout(typingTimer)
  unbindSocket()
})
</script>