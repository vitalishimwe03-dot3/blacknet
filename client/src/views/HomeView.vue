<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// feed</span>
      <span class="section-header__line"></span>
    </div>

    <div class="terminal-input glow-border" style="margin-bottom: 24px;">
      <span class="terminal-input__prefix">$&gt;</span>
      <textarea
        v-model="newPost"
        placeholder="broadcast transmission..."
        rows="2"
        @keydown.enter.ctrl="createPost"
        maxlength="10000"
      ></textarea>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 24px;">
      <span class="text-secondary" style="font-family: var(--font-mono); font-size: 11px;">{{ newPost.length }}/10000</span>
      <button class="btn-hacker btn-hacker--sm" :disabled="!newPost.trim() || posting" @click="createPost">
        {{ posting ? 'TRANSMITTING...' : 'TRANSMIT' }}
      </button>
    </div>

    <div v-if="loading && posts.length === 0" class="loading-spinner">
      Loading feed...
    </div>

    <div v-else-if="posts.length === 0" class="empty-terminal terminal-window">
      <div class="terminal-window__header">
        <span class="terminal-window__dot terminal-window__dot--red"></span>
        <span class="terminal-window__dot terminal-window__dot--yellow"></span>
        <span class="terminal-window__dot terminal-window__dot--green"></span>
        <span class="terminal-window__title">feed.log</span>
      </div>
      <div class="terminal-window__body" style="text-align: center; padding: 40px;">
        <div class="log-line">
          <span class="log-line__level log-line__level--info">INFO</span>
          <span class="log-line__message">No transmissions detected in your feed</span>
        </div>
        <div class="log-line">
          <span class="log-line__level log-line__level--info">INFO</span>
          <span class="log-line__message">Follow other nodes to populate your feed</span>
        </div>
      </div>
    </div>

    <div v-else class="feed-list">
      <PostCard v-for="post in posts" :key="post.id" :post="post" @post-deleted="removePost" />
    </div>

    <div ref="sentinel" class="loading-spinner" v-if="hasMore && !loading">
      <span style="font-family: var(--font-mono); font-size: 12px;">LOADING MORE NODES...</span>
    </div>
    <div v-if="loading && posts.length > 0" class="loading-spinner"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import PostCard from '@/components/posts/PostCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()

const newPost = ref('')
const posting = ref(false)

const { items: posts, loading, hasMore, loadMore, observe, reset } = useInfiniteScroll(async (page) => {
  const res = await api.get('/posts/feed', { params: { page, limit: 20 } })
  return res.data
})

const sentinel = ref(null)

onMounted(() => {
  if (sentinel.value) observe(sentinel.value)
})

onUnmounted(() => {
  reset()
})

async function createPost() {
  if (!newPost.value.trim()) return
  posting.value = true
  try {
    await api.post('/posts', { content: newPost.value, visibility: 'public' })
    newPost.value = ''
    toast.success('Transmission sent')
    reset()
    const firstSentinel = sentinel.value
    if (firstSentinel) observe(firstSentinel)
  } catch (err) {
    toast.error(err.message || 'Failed to transmit')
  } finally {
    posting.value = false
  }
}

function removePost(postId) {
  posts.value = posts.value.filter(p => p.id !== postId)
}
</script>

<style lang="scss" scoped>
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-terminal {
  margin-top: 20px;
}
</style>
