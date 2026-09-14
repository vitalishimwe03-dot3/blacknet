<template>
  <div class="flex h-full">
    <!-- Conversation list -->
    <div class="w-80 border-r border-bn-border flex flex-col flex-shrink-0">
      <div class="p-4 border-b border-bn-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-bn-text font-mono text-sm">Messages</h2>
          <button @click="showNewChat = true" class="p-1.5 rounded-lg bg-bn-accent/10 text-bn-accent hover:bg-bn-accent/20 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
        <input v-model="searchFilter" type="text" class="input py-1.5 text-xs font-mono" placeholder="Search conversations..." />
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-for="conv in filteredConversations" :key="conv.id"
          class="p-3 border-b border-bn-border/50 hover:bg-bn-surface/30 cursor-pointer transition-colors"
          :class="{ 'bg-bn-accent/5 border-l-2 border-l-bn-accent': conv.id === route.params.conversationId }"
          @click="selectConversation(conv)"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-bn-surface flex items-center justify-center text-xs font-mono text-bn-accent border border-bn-border">
              {{ conv.type === 'group' ? '&#9734;' : '&#9993;' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-bn-text truncate">{{ conv.name || 'Direct Message' }}</p>
              <p class="text-xs text-bn-muted truncate font-mono mt-0.5">{{ conv.last_message || 'No messages yet' }}</p>
            </div>
            <span v-if="conv.last_message_at" class="text-[10px] text-bn-muted font-mono whitespace-nowrap">{{ timeAgo(conv.last_message_at) }}</span>
          </div>
        </div>
        <div v-if="filteredConversations.length === 0" class="p-6 text-center text-bn-muted text-sm font-mono">
          No conversations yet
        </div>
      </div>
    </div>

    <!-- Message area -->
    <div class="flex-1 flex flex-col">
      <template v-if="currentConversation">
        <!-- Conversation header -->
        <div class="h-14 flex items-center px-4 border-b border-bn-border bg-bn-dark/50">
          <div class="w-8 h-8 rounded-full bg-bn-accent/20 flex items-center justify-center text-xs font-mono text-bn-accent mr-3 border border-bn-accent/30">
            {{ getInitials(currentConversation.name || 'DM') }}
          </div>
          <div>
            <p class="text-sm font-medium text-bn-text">{{ currentConversation.name || 'Direct Message' }}</p>
            <p class="text-[10px] text-bn-muted font-mono">E2E encryption placeholder</p>
          </div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
          <MessageBubble
            v-for="msg in store.currentMessages"
            :key="msg.id"
            :message="msg"
            :own="msg.sender_id === auth.user?.id"
            :can-edit="msg.sender_id === auth.user?.id"
            @edit="startEdit(msg)"
            @delete="deleteMessage(msg)"
          />

          <div v-if="store.typingUsers?.length" class="text-xs text-bn-muted font-mono italic">
            {{ store.typingUsers.join(', ') }} {{ store.typingUsers.length > 1 ? 'are' : 'is' }} typing...
          </div>
        </div>

        <!-- Input -->
        <div class="p-4 border-t border-bn-border">
          <div v-if="editingMessage" class="mb-2 p-2 rounded-lg bg-bn-accent/5 border border-bn-accent/20 flex items-center justify-between">
            <span class="text-xs text-bn-muted font-mono">Editing message</span>
            <button @click="cancelEdit" class="text-bn-red text-xs font-mono">Cancel</button>
          </div>
          <div class="flex gap-2">
            <input v-model="messageText" @input="onTyping" @keydown.enter.prevent="sendMessage"
              class="input flex-1 font-mono text-sm" :placeholder="editingMessage ? 'Edit message...' : 'Type a message... (encrypted)'" />
            <button @click="sendMessage" :disabled="!messageText.trim()" class="btn-primary px-5">
              {{ editingMessage ? 'Save' : 'Send' }}
            </button>
          </div>
          <p class="text-[10px] text-bn-muted/50 font-mono mt-1">Messages are placeholder-encrypted. Do not send sensitive data.</p>
        </div>
      </template>

      <div v-else class="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <div class="text-4xl mb-4">&#9993;</div>
          <h3 class="text-lg font-semibold text-bn-text mb-2">Encrypted Messaging</h3>
          <p class="text-sm text-bn-muted font-mono max-w-sm">
            Select a conversation or start a new one. End-to-end encryption is a placeholder — implement proper E2E before use.
          </p>
        </div>
      </div>
    </div>

    <!-- New chat modal -->
    <Transition name="modal">
      <div v-if="showNewChat" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showNewChat = false">
        <div class="card p-6 w-full max-w-md glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">New Conversation</h3>
          <div class="space-y-3">
            <input v-model="newChatName" class="input font-mono text-sm" placeholder="Group name (optional)" />
            <input v-model="newChatSearch" class="input font-mono text-sm" placeholder="Search users..." @input="searchUsers" />
            <div class="max-h-40 overflow-y-auto space-y-1">
              <div v-for="u in searchResults" :key="u.id"
                class="p-2 rounded-lg hover:bg-bn-surface cursor-pointer transition-colors flex items-center gap-2"
                :class="{ 'bg-bn-accent/10': selectedUsers.includes(u.id) }"
                @click="toggleUser(u.id)"
              >
                <span class="w-5 h-5 rounded border border-bn-border flex items-center justify-center text-[10px]"
                  :class="selectedUsers.includes(u.id) ? 'bg-bn-accent text-bn-black border-bn-accent' : ''">
                  {{ selectedUsers.includes(u.id) ? '&#10003;' : '' }}
                </span>
                <span class="text-sm text-bn-text">{{ u.display_name || u.username }}</span>
                <span class="text-xs text-bn-muted font-mono">@{{ u.username }}</span>
              </div>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="createChat" :disabled="selectedUsers.length === 0" class="btn-primary flex-1 font-mono text-sm">
                Create
              </button>
              <button @click="showNewChat = false" class="btn-secondary font-mono text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMessagesStore } from '../stores/messages'
import { getSocket } from '../utils/socket'
import { timeAgo, getInitials } from '../utils/helpers'
import api from '../utils/api'
import MessageBubble from '../components/messaging/MessageBubble.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useMessagesStore()
const searchFilter = ref('')
const messageText = ref('')
const messagesContainer = ref(null)
const showNewChat = ref(false)
const newChatName = ref('')
const newChatSearch = ref('')
const searchResults = ref([])
const selectedUsers = ref([])
const currentConversation = ref(null)
const editingMessage = ref(null)
let typingTimer = null

const filteredConversations = computed(() => {
  if (!searchFilter.value) return store.conversations
  return store.conversations.filter(c => c.name?.toLowerCase().includes(searchFilter.value.toLowerCase()))
})

function selectConversation(conv) {
  currentConversation.value = conv
  const socket = getSocket()
  if (store.currentConversation && store.currentConversation !== conv.id) {
    socket.emit('leave_conversation', store.currentConversation)
  }
  socket.emit('join_conversation', conv.id)
  store.fetchMessages(conv.id)
  router.push(`/messages/${conv.id}`)
}

function openConversation(id) {
  const conv = store.conversations.find(c => c.id === id)
  if (conv) {
    selectConversation(conv)
  } else {
    currentConversation.value = { id, name: 'Conversation' }
    getSocket().emit('join_conversation', id)
    store.fetchMessages(id)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function sendMessage() {
  if (!messageText.value.trim() || !currentConversation.value) return
  if (editingMessage.value) {
    await api.put(`/messages/message/${editingMessage.value.id}`, { content: messageText.value })
    const socket = getSocket()
    socket.emit('stop_typing', { conversationId: currentConversation.value.id })
    cancelEdit()
    return
  }
  await store.sendMessage(currentConversation.value.id, messageText.value)
  messageText.value = ''
  getSocket().emit('stop_typing', { conversationId: currentConversation.value.id })
  scrollToBottom()
}

function onTyping() {
  const socket = getSocket()
  if (!currentConversation.value) return
  socket.emit('typing', {
    conversationId: currentConversation.value.id,
    username: auth.user?.username
  })
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    socket.emit('stop_typing', { conversationId: currentConversation.value.id })
  }, 2000)
}

function startEdit(msg) {
  editingMessage.value = msg
  messageText.value = msg.content
}

function cancelEdit() {
  editingMessage.value = null
  messageText.value = ''
}

async function deleteMessage(msg) {
  if (!confirm('Delete this message?')) return
  await api.delete(`/messages/message/${msg.id}`)
}

async function searchUsers() {
  if (newChatSearch.value.length < 2) { searchResults.value = []; return }
  const { data } = await api.get(`/users/search?q=${newChatSearch.value}`)
  searchResults.value = data.users.filter(u => u.id !== auth.user?.id)
}

function toggleUser(userId) {
  const idx = selectedUsers.value.indexOf(userId)
  if (idx >= 0) selectedUsers.value.splice(idx, 1)
  else selectedUsers.value.push(userId)
}

async function createChat() {
  const type = selectedUsers.value.length === 1 ? 'direct' : 'group'
  const conv = await store.createConversation(type, newChatName.value, selectedUsers.value)
  showNewChat.value = false
  newChatName.value = ''
  selectedUsers.value = []
  selectConversation(conv)
}

function handleSearchQuery() {
  const q = route.query?.search
  if (q && typeof q === 'string' && q.length >= 2) {
    api.get(`/messages/search?q=${encodeURIComponent(q)}`)
      .then(({ data }) => {
        if (data.messages?.length) {
          openConversation(data.messages[0].conversation_id)
        }
      })
      .catch(() => {})
    router.replace({ path: route.path })
  }
}

watch(() => store.currentMessages, scrollToBottom, { deep: true })

watch(() => route.params.conversationId, (id) => {
  if (id) openConversation(id)
})

onMounted(async () => {
  const socket = getSocket()
  await store.fetchConversations()
  if (route.params.conversationId) {
    openConversation(route.params.conversationId)
  }
  handleSearchQuery()
})

onUnmounted(() => {
  clearTimeout(typingTimer)
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>