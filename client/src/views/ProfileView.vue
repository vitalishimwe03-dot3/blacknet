<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-spinner">Loading node data...</div>

    <template v-else-if="user">
      <div class="profile-cover" :style="user.cover_image ? { backgroundImage: `url(/uploads/covers/${user.cover_image})` } : {}">
        <div class="profile-cover__overlay"></div>
      </div>

      <div class="profile-header">
        <div class="profile-header__avatar">
          <Avatar :src="user.avatar" :name="user.display_name || user.username" size="xl" :verified="user.is_verified" />
        </div>
        <div class="profile-header__info">
          <div class="profile-header__names">
            <h1 class="profile-header__name glitch-text-subtle">{{ user.display_name || user.username }}</h1>
            <span class="profile-header__username terminal-prompt">@{{ user.username }}</span>
          </div>
          <p v-if="user.bio" class="profile-header__bio">{{ user.bio }}</p>
          <div class="profile-header__meta">
            <span class="status-badge" :class="user.role === 'admin' || user.role === 'super_admin' ? 'status-badge--online' : 'status-badge--offline'">
              {{ user.role === 'super_admin' ? 'SYS_ADMIN' : user.role === 'admin' ? 'ADMIN' : 'NODE' }}
            </span>
            <span class="text-secondary" style="font-family: var(--font-mono); font-size: 12px;">
              joined {{ formatDate(user.created_at) }}
            </span>
          </div>
          <div class="profile-header__stats">
            <div class="stat-item">
              <span class="stat-item__value">{{ user.posts_count }}</span>
              <span class="stat-item__label">transmissions</span>
            </div>
            <div class="stat-item">
              <span class="stat-item__value">{{ user.followers_count }}</span>
              <span class="stat-item__label">followers</span>
            </div>
            <div class="stat-item">
              <span class="stat-item__value">{{ user.following_count }}</span>
              <span class="stat-item__label">following</span>
            </div>
          </div>
        </div>
        <div class="profile-header__actions" v-if="isAuthenticated && user.username !== currentUser?.username">
          <button class="btn-hacker" :class="user.is_following ? 'btn-hacker--danger' : ''" @click="toggleFollow">
            {{ user.is_following ? '[ DISCONNECT ]' : '[ CONNECT ]' }}
          </button>
          <router-link :to="`/messages/${user.id}`" class="btn-hacker">
            [ MSG ]
          </router-link>
        </div>
      </div>

      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tabs__tab" :class="{ 'tabs__tab--active': activeTab === 'posts' }" @click="activeTab = 'posts'">
          Transmissions
        </button>
      </div>

      <div v-if="postsLoading" class="loading-spinner">Loading transmissions...</div>

      <div v-else-if="posts.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">profile.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No transmissions from this node</span>
          </div>
        </div>
      </div>

      <div v-else class="feed-list">
        <PostCard v-for="post in posts" :key="post.id" :post="post" @post-deleted="removePost" />
      </div>

      <div ref="sentinel" class="loading-spinner" v-if="hasMore && !postsLoading"></div>
    </template>

    <div v-else class="terminal-window" style="max-width: 500px; margin: 40px auto;">
      <div class="terminal-window__header">
        <span class="terminal-window__dot terminal-window__dot--red"></span>
        <span class="terminal-window__title">error.log</span>
      </div>
      <div class="terminal-window__body" style="text-align: center; padding: 40px;">
        <div class="log-line">
          <span class="log-line__level log-line__level--error">ERR</span>
          <span class="log-line__message">Node not found in network</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import PostCard from '@/components/posts/PostCard.vue'
import Avatar from '@/components/common/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { formatDate } from '@/utils/format'
import api from '@/services/api'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const user = ref(null)
const loading = ref(true)
const activeTab = ref('posts')
const isAuthenticated = ref(authStore.isAuthenticated)
const currentUser = ref(authStore.user)

const { items: posts, loading: postsLoading, hasMore, loadMore, observe, reset } = useInfiniteScroll(async (page) => {
  const res = await api.get(`/users/${route.params.username}/posts`, { params: { page, limit: 20 } })
  return res.data
})

const sentinel = ref(null)

async function fetchUser() {
  loading.value = true
  try {
    const res = await api.get(`/users/${route.params.username}`)
    user.value = res.data
  } catch (err) {
    user.value = null
  } finally {
    loading.value = false
  }
}

async function toggleFollow() {
  try {
    const res = await api.post(`/follows/${route.params.username}`)
    user.value.is_following = res.data.following
    user.value.followers_count += res.data.following ? 1 : -1
    toast.success(res.data.following ? 'Connected' : 'Disconnected')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

function removePost(postId) {
  posts.value = posts.value.filter(p => p.id !== postId)
}

watch(() => route.params.username, () => {
  fetchUser()
  reset()
  if (sentinel.value) observe(sentinel.value)
})

onMounted(() => {
  fetchUser()
  if (sentinel.value) observe(sentinel.value)
})

onUnmounted(() => reset())
</script>

<style lang="scss" scoped>
.profile-cover {
  height: 200px;
  background: var(--bg-secondary);
  background-size: cover;
  background-position: center;
  position: relative;
  margin: -24px -20px 0;

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, var(--bg-primary));
  }
}

.profile-header {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: -60px;
  position: relative;
  padding: 0 0 20px;

  &__avatar {
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 200px;
  }

  &__names {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__name {
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 700;
  }

  &__username {
    font-family: var(--font-mono);
    font-size: 14px;
  }

  &__bio {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 8px;
    line-height: 1.5;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  &__stats {
    display: flex;
    gap: 24px;
    margin-top: 12px;
  }

  &__actions {
    display: flex;
    gap: 8px;
    align-self: flex-start;
  }
}

.stat-item {
  &__value {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    color: var(--green);
  }

  &__label {
    display: block;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;

    &__actions {
      width: 100%;
      justify-content: center;
    }

    &__stats {
      justify-content: center;
    }
  }
}
</style>
