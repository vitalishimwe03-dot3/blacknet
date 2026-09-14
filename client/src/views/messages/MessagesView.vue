<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// messages</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading" class="loading-spinner">Loading encrypted channels...</div>

    <template v-else>
      <div v-if="conversations.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">messages.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No active encrypted channels</span>
          </div>
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">Visit a node's profile to start a conversation</span>
          </div>
        </div>
      </div>

      <div v-else class="conversations-list">
        <router-link
          v-for="conv in conversations"
          :key="conv.id"
          :to="`/messages/${conv.other_user?.id}`"
          class="conversation-item hacker-card"
        >
          <Avatar :src="conv.other_user?.avatar" :name="conv.other_user?.display_name || conv.other_user?.username" size="md" />
          <div class="conversation-item__info">
            <div class="conversation-item__header">
              <span class="conversation-item__name">{{ conv.other_user?.display_name || conv.other_user?.username }}</span>
              <span class="conversation-item__time">{{ timeAgo(conv.created_at) }}</span>
            </div>
            <div class="conversation-item__preview">
              <span class="terminal-input__prefix" style="font-size: 11px;">$&gt;</span>
              {{ conv.content }}
            </div>
          </div>
          <span v-if="conv.unread_count > 0" class="unread-badge">{{ conv.unread_count }}</span>
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const conversations = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/messages/conversations')
    conversations.value = res.data.conversations || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: rgba(0, 214, 138, 0.3);
    background: var(--card-bg-hover);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
  }

  &__time {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  &__preview {
    font-family: var(--font-code);
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.unread-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: var(--green);
  color: var(--bg-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}
</style>
