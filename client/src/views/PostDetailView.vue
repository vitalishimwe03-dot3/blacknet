<template>
  <div class="page">
    <div v-if="loading" class="loading-spinner">Loading transmission...</div>

    <template v-else-if="post">
      <div class="section-header">
        <span class="section-header__title">// transmission_detail</span>
        <span class="section-header__line"></span>
      </div>

      <PostCard :post="post" :full="true" />

      <div style="margin-top: 24px;">
        <div class="section-header">
          <span class="section-header__title">// comments ({{ post.comments_count }})</span>
          <span class="section-header__line"></span>
        </div>
        <CommentsSection :post-id="post.id" />
      </div>
    </template>

    <div v-else class="terminal-window" style="max-width: 500px; margin: 40px auto;">
      <div class="terminal-window__header">
        <span class="terminal-window__dot terminal-window__dot--red"></span>
        <span class="terminal-window__title">error.log</span>
      </div>
      <div class="terminal-window__body" style="text-align: center; padding: 40px;">
        <div class="log-line">
          <span class="log-line__level log-line__level--error">ERR</span>
          <span class="log-line__message">Transmission not found or deleted</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PostCard from '@/components/posts/PostCard.vue'
import CommentsSection from '@/components/posts/CommentsSection.vue'
import api from '@/services/api'

const route = useRoute()
const post = ref(null)
const loading = ref(true)

async function fetchPost() {
  loading.value = true
  try {
    const res = await api.get(`/posts/${route.params.id}`)
    post.value = res.data
  } catch {
    post.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, fetchPost)
onMounted(fetchPost)
</script>

<style lang="scss" scoped>
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
