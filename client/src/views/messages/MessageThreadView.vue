<template>
  <div class="message-thread">
    <div class="thread-header">
      <router-link to="/messages" class="icon-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
      </router-link>
      <Avatar :src="otherUser?.avatar" :name="otherUser?.display_name || otherUser?.username" size="sm" />
      <div class="thread-header__info">
        <span class="thread-header__name">{{ otherUser?.display_name || otherUser?.username }}</span>
        <span class="thread-header__status">
          <span class="status-badge status-badge--online">ENCRYPTED</span>
        </span>
      </div>
    </div>

    <div class="thread-messages" ref="messagesContainer">
      <div v-if="loading" class="loading-spinner">Loading encrypted messages...</div>

      <template v-else>
        <div v-if="messages.length === 0" class="terminal-window" style="margin: 40px 20px;">
          <div class="terminal-window__header">
            <span class="terminal-window__dot terminal-window__dot--green"></span>
            <span class="terminal-window__title">channel.log</span>
          </div>
          <div class="terminal-window__body" style="text-align: center; padding: 40px;">
            <div class="log-line">
              <span class="log-line__level log-line__level--info">INFO</span>
              <span class="log-line__message">Encrypted channel established. Send the first message.</span>
            </div>
          </div>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-bubble"
          :class="{ 'message-bubble--mine': msg.sender_id === currentUserId }"
        >
          <div class="message-bubble__content">
            <div class="message-bubble__text">{{ msg.content }}</div>
            <div class="message-bubble__time">{{ timeAgo(msg.created_at) }}</div>
          </div>
        </div>
      </template>
    </div>

    <div class="thread-input">
      <div class="terminal-input glow-border" style="flex: 1;">
        <span class="terminal-input__prefix">$&gt;</span>
        <input
          v-model="newMessage"
          type="text"
          placeholder="type encrypted message..."
          @keydown.enter="sendMessage"
          maxlength="5000"
        />
      </div>
      <button class="btn-hacker btn-hacker--solid btn-hacker--sm" :disabled="!newMessage.trim() || sending" @click="sendMessage">
        {{ sending ? '...' : 'SEND' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import Avatar from '@/components/common/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const currentUserId = ref(authStore.user?.id)
const otherUser = ref(null)
const messages = ref([])
const loading = ref(true)
const sending = ref(false)
const newMessage = ref('')
const messagesContainer = ref(null)

async function fetchMessages() {
  loading.value = true
  try {
    const res = await api.get(`/messages/${route.params.userId}`)
    messages.value = res.data.messages || []
    otherUser.value = res.data.other_user
    await nextTick()
    scrollToBottom()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  sending.value = true
  try {
    const res = await api.post(`/messages/${route.params.userId}`, { content: newMessage.value })
    messages.value.push(res.data)
    newMessage.value = ''
    await nextTick()
    scrollToBottom()
  } catch (err) {
    toast.error(err.message || 'Failed to send')
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(() => route.params.userId, fetchMessages)
onMounted(fetchMessages)
</script>

<style lang="scss" scoped>
.message-thread {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}

.thread-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-green);
  background: var(--card-bg);

  &__info {
    flex: 1;
  }

  &__name {
    font-weight: 600;
    font-size: 15px;
    display: block;
  }

  &__status {
    font-size: 11px;
  }
}

.thread-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-bubble {
  display: flex;
  max-width: 70%;

  &--mine {
    align-self: flex-end;

    .message-bubble__content {
      background: rgba(0, 214, 138, 0.1);
      border-color: rgba(0, 214, 138, 0.2);
    }
  }

  &__content {
    padding: 10px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-green);
    border-radius: var(--radius-md);
    border-top-left-radius: 4px;
  }

  &__text {
    font-family: var(--font-code);
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }

  &__time {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 4px;
  }
}

.thread-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-green);
  background: var(--card-bg);
}
</style>
