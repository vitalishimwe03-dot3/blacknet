<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// search</span>
      <span class="section-header__line"></span>
    </div>

    <div class="terminal-input glow-border" style="margin-bottom: 24px;">
      <span class="terminal-input__prefix">grep -i</span>
      <input
        v-model="query"
        type="text"
        placeholder="search the network..."
        @input="debouncedSearch"
        @keydown.enter="search"
      />
    </div>

    <div v-if="loading" class="loading-spinner">Querying network nodes...</div>

    <div v-else-if="searched" class="search-results">
      <div v-if="users.length" class="hacker-card" style="margin-bottom: 20px;">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// matching_nodes ({{ users.length }})</span>
          <span class="section-header__line"></span>
        </div>
        <div class="result-list">
          <router-link
            v-for="user in users"
            :key="user.id"
            :to="`/u/${user.username}`"
            class="result-item"
          >
            <Avatar :src="user.avatar" :name="user.display_name || user.username" size="md" :verified="user.is_verified" />
            <div class="result-item__info">
              <div class="result-item__name">{{ user.display_name || user.username }}</div>
              <div class="result-item__username">@{{ user.username }}</div>
              <div v-if="user.bio" class="result-item__bio">{{ user.bio }}</div>
            </div>
          </router-link>
        </div>
      </div>

      <div v-if="posts.length" class="hacker-card" style="margin-bottom: 20px;">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// matching_transmissions ({{ posts.length }})</span>
          <span class="section-header__line"></span>
        </div>
        <div class="feed-list">
          <PostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>
      </div>

      <div v-if="hashtags.length" class="hacker-card">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// matching_hashtags ({{ hashtags.length }})</span>
          <span class="section-header__line"></span>
        </div>
        <div class="result-list">
          <router-link
            v-for="tag in hashtags"
            :key="tag.id"
            :to="`/hashtag/${tag.name}`"
            class="result-item"
          >
            <span class="hashtag-icon">#</span>
            <div class="result-item__info">
              <div class="result-item__name">#{{ tag.name }}</div>
              <div class="result-item__bio">{{ tag.posts_count }} posts</div>
            </div>
          </router-link>
        </div>
      </div>

      <div v-if="!users.length && !posts.length && !hashtags.length" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__title">search.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--warning">WARN</span>
            <span class="log-line__message">No results found for "{{ query }}"</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PostCard from '@/components/posts/PostCard.vue'
import Avatar from '@/components/common/Avatar.vue'
import { debounce } from '@/utils/format'
import api from '@/services/api'

const route = useRoute()

const query = ref(route.query.q || '')
const loading = ref(false)
const searched = ref(false)
const users = ref([])
const posts = ref([])
const hashtags = ref([])

async function search() {
  if (!query.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const res = await api.get('/search', { params: { q: query.value } })
    users.value = res.data.users || []
    posts.value = res.data.posts || []
    hashtags.value = res.data.hashtags || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const debouncedSearch = debounce(search, 400)

onMounted(() => {
  if (query.value) search()
})
</script>

<style lang="scss" scoped>
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-list {
  display: flex;
  flex-direction: column;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 214, 138, 0.05);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-weight: 600;
    font-size: 14px;
  }

  &__username {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--green);
  }

  &__bio {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.hashtag-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 214, 138, 0.08);
  border-radius: var(--radius-sm);
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
}
</style>
