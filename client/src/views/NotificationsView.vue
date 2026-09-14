<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// notifications</span>
      <span class="section-header__line"></span>
      <button v-if="unreadCount > 0" class="btn-hacker btn-hacker--sm" @click="markAllRead">
        MARK ALL READ
      </button>
    </div>

    <div v-if="loading" class="loading-spinner">Loading notifications...</div>

    <template v-else>
      <div v-if="notifications.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">notifications.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No notifications in queue</span>
          </div>
        </div>
      </div>

      <div v-else class="notifications-list">
        <div
          v-for="notif in notifications"
          :key="notif.id"
          class="notification-item hacker-card"
          :class="{ 'notification-item--unread': !notif.is_read }"
          @click="handleNotification(notif)"
        >
          <Avatar :src="notif.from_avatar" :name="notif.from_display_name || notif.from_username" size="sm" />
          <div class="notification-item__content">
            <div class="notification-item__text">
              <span class="notification-item__user">{{ notif.from_display_name || notif.from_username }}</span>
              <span class="notification-item__action">{{ actionText(notif.type) }}</span>
            </div>
            <div v-if="notif.content" class="notification-item__preview">{{ notif.content }}</div>
            <span class="notification-item__time">{{ timeAgo(notif.created_at) }}</span>
          </div>
          <span class="notification-item__type">
            {{ typeIcon(notif.type) }}
          </span>
        </div>
      </div>

      <div ref="sentinel" class="loading-spinner" v-if="hasMore && !loading"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from '@/components/common/Avatar.vue'
import { useNotificationStore } from '@/stores/notifications'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const router = useRouter()
const notifStore = useNotificationStore()

const unreadCount = ref(0)

const { items: notifications, loading, hasMore, observe, reset } = useInfiniteScroll(async (page) => {
  const res = await api.get('/notifications', { params: { page, limit: 30 } })
  if (page === 1) {
    unreadCount.value = res.data.unread || 0
  }
  return res.data
})

const sentinel = ref(null)

onMounted(() => {
  if (sentinel.value) observe(sentinel.value)
})

onUnmounted(() => reset())

async function markAllRead() {
  try {
    await api.put('/notifications/read', { ids: notifications.value.filter(n => !n.is_read).map(n => n.id) })
    notifications.value.forEach(n => n.is_read = 1)
    unreadCount.value = 0
    notifStore.clear()
  } catch (err) {
    console.error(err)
  }
}

function handleNotification(notif) {
  if (!notif.is_read) {
    notif.is_read = 1
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    api.put('/notifications/read', { ids: [notif.id] }).catch(() => {})
  }
  if (notif.reference_type === 'post' && notif.reference_id) {
    router.push(`/post/${notif.reference_id}`)
  } else if (notif.type === 'follow' && notif.from_username) {
    router.push(`/u/${notif.from_username}`)
  } else if (notif.type === 'message') {
    router.push('/messages')
  }
}

function actionText(type) {
  const map = {
    like: 'liked your transmission',
    comment: 'commented on your transmission',
    follow: 'connected to your node',
    message: 'sent you an encrypted message',
    mention: 'mentioned you',
    report: 'filed a report'
  }
  return map[type] || type
}

function typeIcon(type) {
  const map = {
    like: '<3',
    comment: '//',
    follow: '>>',
    message: '>>',
    mention: '@',
    report: '!!'
  }
  return map[type] || '?'
}
</script>

<style lang="scss" scoped>
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 14px 16px;

  &:hover {
    background: var(--card-bg-hover);
    border-color: rgba(0, 214, 138, 0.2);
  }

  &--unread {
    border-left: 2px solid var(--green);
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__text {
    font-size: 14px;
  }

  &__user {
    font-weight: 600;
    margin-right: 4px;
  }

  &__action {
    color: var(--text-secondary);
  }

  &__preview {
    font-family: var(--font-code);
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
    display: block;
  }

  &__type {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--green);
    white-space: nowrap;
  }
}
</style>
