<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// explore</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading && posts.length === 0" class="loading-spinner">Scanning network...</div>

    <template v-else>
      <div v-if="trending.length" class="hacker-card" style="margin-bottom: 24px;">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// trending_hashtags</span>
          <span class="section-header__line"></span>
        </div>
        <div class="trending-list">
          <router-link
            v-for="tag in trending"
            :key="tag.id"
            :to="`/hashtag/${tag.name}`"
            class="trending-item"
          >
            <span class="trending-item__hash">#</span>{{ tag.name }}
            <span class="trending-item__count">{{ tag.posts_count }} posts</span>
          </router-link>
        </div>
      </div>

      <div v-if="popularUsers.length" class="hacker-card" style="margin-bottom: 24px;">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// top_nodes</span>
          <span class="section-header__line"></span>
        </div>
        <div class="popular-list">
          <router-link
            v-for="user in popularUsers"
            :key="user.id"
            :to="`/u/${user.username}`"
            class="popular-item"
          >
            <Avatar :src="user.avatar" :name="user.display_name || user.username" size="sm" />
            <div>
              <div class="popular-item__name">{{ user.display_name || user.username }}</div>
              <div class="popular-item__username">@{{ user.username }}</div>
            </div>
            <span class="text-secondary" style="margin-left: auto; font-family: var(--font-mono); font-size: 11px;">
              {{ user.followers_count }} followers
            </span>
          </router-link>
        </div>
      </div>

      <div class="section-header">
        <span class="section-header__title">// public_transmissions</span>
        <span class="section-header__line"></span>
      </div>

      <div v-if="posts.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">explore.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No public transmissions found</span>
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
import { ref, onMounted } from 'vue'
import PostCard from '@/components/posts/PostCard.vue'
import Avatar from '@/components/common/Avatar.vue'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import api from '@/services/api'

const trending = ref([])
const popularUsers = ref([])

const { items: posts, loading, hasMore, loadMore, observe, reset } = useInfiniteScroll(async (page) => {
  const res = await api.get('/posts/explore', { params: { page, limit: 20 } })
  if (page === 1) {
    trending.value = res.data.trending || []
    popularUsers.value = res.data.popular_users || []
  }
  return res.data
})

const sentinel = ref(null)

onMounted(() => {
  if (sentinel.value) observe(sentinel.value)
})
</script>

<style lang="scss" scoped>
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trending-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trending-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(0, 214, 138, 0.05);
  border: 1px solid var(--border-green);
  border-radius: var(--radius-sm);
  font-family: var(--font-code);
  font-size: 13px;
  color: var(--green);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 214, 138, 0.1);
    border-color: var(--green);
    box-shadow: 0 0 10px rgba(0, 214, 138, 0.1);
  }

  &__hash {
    color: var(--green-dim);
  }

  &__count {
    margin-left: 6px;
    font-size: 11px;
    color: var(--text-muted);
  }
}

.popular-list {
  display: flex;
  flex-direction: column;
}

.popular-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 214, 138, 0.05);
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
  }

  &__username {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--green);
  }
}
</style>
