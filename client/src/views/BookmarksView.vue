<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// bookmarks</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading" class="loading-spinner">Loading saved transmissions...</div>

    <template v-else>
      <div v-if="bookmarks.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">bookmarks.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No transmissions bookmarked</span>
          </div>
        </div>
      </div>

      <div v-else class="bookmarks-list">
        <div v-for="bm in bookmarks" :key="bm.id" class="bookmark-item hacker-card">
          <div class="bookmark-item__header">
            <Avatar :src="bm.avatar" :name="bm.display_name || bm.username" size="sm" />
            <div>
              <span class="bookmark-item__name">{{ bm.display_name || bm.username }}</span>
              <span class="bookmark-item__username">@{{ bm.username }}</span>
            </div>
            <span class="bookmark-item__time">{{ timeAgo(bm.post_created_at) }}</span>
          </div>
          <div class="bookmark-item__content">{{ bm.content }}</div>
          <div class="bookmark-item__stats">
            <span>{{ bm.likes_count }} likes</span>
            <span>{{ bm.comments_count }} comments</span>
          </div>
        </div>
      </div>

      <div ref="sentinel" class="loading-spinner" v-if="hasMore && !loading"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { timeAgo } from '@/utils/format'

const { items: bookmarks, loading, hasMore, observe, reset } = useInfiniteScroll(async (page) => {
  const { default: api } = await import('@/services/api')
  const res = await api.get('/bookmarks', { params: { page, limit: 20 } })
  return { items: res.data.bookmarks, ...res.data }
})

const sentinel = ref(null)

onMounted(() => {
  if (sentinel.value) observe(sentinel.value)
})

onUnmounted(() => reset())
</script>

<style lang="scss" scoped>
.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bookmark-item {
  padding: 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
    margin-right: 4px;
  }

  &__username {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--green);
  }

  &__time {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  &__content {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  &__stats {
    display: flex;
    gap: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }
}
</style>
