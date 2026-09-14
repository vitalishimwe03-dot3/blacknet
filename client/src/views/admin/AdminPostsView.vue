<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// admin_posts</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading" class="loading-spinner">Scanning transmissions...</div>

    <template v-else>
      <div v-if="posts.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">moderation.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">All transmissions nominal</span>
          </div>
        </div>
      </div>

      <div v-else class="posts-list">
        <div v-for="post in posts" :key="post.id" class="post-row hacker-card">
          <div class="post-row__header">
            <Avatar :src="post.avatar" :name="post.display_name || post.username" size="sm" />
            <div>
              <span class="post-row__user">{{ post.display_name || post.username }}</span>
              <span class="post-row__time">@{{ post.username }} - {{ timeAgo(post.created_at) }}</span>
            </div>
          </div>
          <div class="post-row__content">{{ post.content }}</div>
          <div class="post-row__stats">
            <span>{{ post.likes_count }} likes</span>
            <span>{{ post.comments_count }} comments</span>
          </div>
          <div class="post-row__actions">
            <router-link :to="`/post/${post.id}`" class="btn-hacker btn-hacker--sm">VIEW</router-link>
            <button class="btn-hacker btn-hacker--danger btn-hacker--sm" @click="deletePost(post)">DELETE</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const toast = useToastStore()
const posts = ref([])
const loading = ref(true)

async function fetchPosts() {
  loading.value = true
  try {
    const res = await api.get('/admin/posts')
    posts.value = res.data.posts || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function deletePost(post) {
  try {
    await api.delete(`/posts/${post.id}`)
    posts.value = posts.value.filter(p => p.id !== post.id)
    toast.success('Transmission deleted')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

onMounted(fetchPosts)
</script>

<style lang="scss" scoped>
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-row {
  padding: 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__user {
    font-weight: 600;
    font-size: 14px;
    margin-right: 6px;
  }

  &__time {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  &__content {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 10px;
    max-height: 100px;
    overflow: hidden;
  }

  &__stats {
    display: flex;
    gap: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
