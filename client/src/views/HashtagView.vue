<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// hashtag: #{{ $route.params.name }}</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading" class="loading-spinner">Querying hashtag nodes...</div>

    <template v-else>
      <div v-if="tagInfo" class="hacker-card" style="margin-bottom: 24px;">
        <div class="hashtag-header">
          <span class="hashtag-hash">#</span>
          <span class="hashtag-name neon-glow">{{ tagInfo.name }}</span>
          <span class="hashtag-count text-secondary">{{ tagInfo.posts_count }} transmissions</span>
        </div>
      </div>

      <div v-if="posts.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">hashtag.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No transmissions found with this hashtag</span>
          </div>
        </div>
      </div>

      <div v-else class="feed-list">
        <PostCard v-for="post in posts" :key="post.id" :post="post" />
      </div>

      <div ref="sentinel" class="loading-spinner" v-if="hasMore && !loading"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PostCard from '@/components/posts/PostCard.vue'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import api from '@/services/api'

const route = useRoute()
const tagInfo = ref(null)

const { items: posts, loading, hasMore, loadMore, observe, reset } = useInfiniteScroll(async (page) => {
  const res = await api.get(`/hashtags/${route.params.name}`, { params: { page, limit: 20 } })
  if (page === 1 && res.data.hashtag) {
    tagInfo.value = res.data.hashtag
  }
  return res.data
})

const sentinel = ref(null)

onMounted(() => {
  if (sentinel.value) observe(sentinel.value)
})

watch(() => route.params.name, () => {
  reset()
  tagInfo.value = null
  if (sentinel.value) observe(sentinel.value)
})

onUnmounted(() => reset())
</script>

<style lang="scss" scoped>
.hashtag-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hashtag-hash {
  font-family: var(--font-mono);
  font-size: 32px;
  color: var(--green);
  font-weight: 700;
}

.hashtag-name {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--green-bright);
}

.hashtag-count {
  font-family: var(--font-mono);
  font-size: 13px;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
