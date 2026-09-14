<template>
  <div class="post-card">
    <!-- Header -->
    <div class="post-card__header">
      <div class="post-card__author" @click="goToProfile">
        <Avatar :src="post.avatar" :name="post.display_name || post.username" :size="'md'" :verified="post.is_verified" />
        <div class="post-card__author-info">
          <span class="post-card__display-name">
            {{ post.display_name || post.username }}
            <span v-if="post.is_verified" class="verified-badge" title="Verified">✓</span>
          </span>
          <span class="post-card__meta">
            <span class="post-card__username">@{{ post.username }}</span>
            <span class="post-card__dot">·</span>
            <span class="post-card__time">{{ timeAgo(post.created_at) }}</span>
          </span>
        </div>
      </div>
      
      <div class="post-card__actions">
        <button class="icon-btn" aria-label="More options" @click="menuOpen = !menuOpen">⋯</button>
        <transition name="dropdown">
          <div v-if="menuOpen" class="dropdown-menu post-card__menu" @click.stop>
            <button v-if="canDelete" class="dropdown-menu__item dropdown-menu__item--danger" @click="handleDelete">
              Delete post
            </button>
            <button class="dropdown-menu__item dropdown-menu__item--danger" @click="handleReport">
              Report
            </button>
            <button v-if="showShare" class="dropdown-menu__item" @click="handleShare">
              Share external
            </button>
            <button class="dropdown-menu__item" @click="handleCopyLink">Copy link</button>
          </div>
        </transition>
      </div>
    </div>
    
    <!-- Content -->
    <div v-if="post.content" class="post-card__content" @click="goToPost">
      <PostContent :content="post.content" :hashtags="post.hashtags" />
    </div>
    
    <!-- Media -->
    <template v-if="post.media && post.media.length > 0">
      <div v-if="post.media.length === 1" class="post-card__media-single" @click="goToPost">
        <MediaPreview :file="post.media[0]" :expanded="expanded" />
      </div>
      <div v-else class="post-card__media-grid" :class="`post-card__media-grid--${Math.min(post.media.length, 4)}`">
        <div v-for="(file, idx) in post.media.slice(0, 4)" :key="file.id" class="post-card__media-item" @click="goToPost">
          <MediaPreview :file="file" />
          <span v-if="idx === 3 && post.media.length > 4" class="post-card__media-more">+{{ post.media.length - 4 }}</span>
        </div>
      </div>
    </template>
    
    <!-- Actions -->
    <div class="post-card__footer">
      <button class="action-btn" :class="{ 'action-btn--active': post.is_liked }" @click="toggleLike">
        <span class="action-btn__icon">
          <svg v-if="post.is_liked" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </span>
        <span class="action-btn__count">{{ post.likes_count }}</span>
      </button>
      
      <button class="action-btn" @click="goToPost">
        <span class="action-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </span>
        <span class="action-btn__count">{{ post.comments_count }}</span>
      </button>
      
      <button class="action-btn" :class="{ 'action-btn--active': post.is_bookmarked }" @click="bookmarkStore.toggleBookmark(post)">
        <span class="action-btn__icon">
          <svg v-if="post.is_bookmarked" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </span>
      </button>
      
      <button class="action-btn" @click="clickOutside">
        <span class="action-btn__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from '@/components/common/Avatar.vue'
import MediaPreview from '@/components/media/MediaPreview.vue'
import PostContent from '@/components/posts/PostContent.vue'
import api from '@/services/api'
import { timeAgo } from '@/utils/format'
import { useToastStore } from '@/stores/toast'
import { usePosts } from '@/composables/usePosts'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['post-deleted'])

const props = defineProps({
  post: { type: Object, required: true },
  expanded: { type: Boolean, default: false }
})

const router = useRouter()
const toastStore = useToastStore()
const { toggleLike, toggleBookmark, sharePost, deletePost } = usePosts()
const authStore = useAuthStore()
const bookmarkStore = { toggleBookmark }
const menuOpen = ref(false)

const canDelete = computed(() => {
  return props.post.user_id === authStore.user?.id || authStore.isAdmin
})

function goToPost() {
  router.push(`/post/${props.post.id}`)
}

function goToProfile() {
  router.push(`/u/${props.post.username}`)
}

async function handleDelete() {
  menuOpen.value = false
  const ok = await deletePost(props.post.id)
  if (ok) {
    emit('post-deleted', props.post.id)
  }
}

async function handleReport() {
  menuOpen.value = false
  const reason = window.prompt('Reason for reporting this post?')
  if (!reason) return
  try {
    await api.post(`/posts/${props.post.id}/report`, {
      reason,
      description: reason
    })
    toastStore.success('Post reported')
  } catch (err) {
    toastStore.error(err.message || 'Failed to report')
  }
}

async function handleShare() {
  menuOpen.value = false
  try {
    await api.post(`/posts/${props.post.id}/share`)
    if (navigator.share) {
      await navigator.share({
        title: 'Check out this post',
        url: window.location.origin + `/post/${props.post.id}`
      })
    } else {
      await navigator.clipboard.writeText(window.location.origin + `/post/${props.post.id}`)
      toastStore.success('Link copied')
    }
  } catch (err) {
    toastStore.error(err.message || 'Failed to share')
  }
}

async function handleCopyLink() {
  menuOpen.value = false
  await navigator.clipboard.writeText(window.location.origin + `/post/${props.post.id}`)
  toastStore.success('Link copied to clipboard')
}

</script>

<style scoped lang="scss">
.post-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.3s ease, transform 0.2s ease;
  
  &:hover {
    border-color: rgba(255, 45, 85, 0.2);
  }
  
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
    gap: 12px;
  }
  
  &__author {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    min-width: 0;
    
    &:hover .post-card__display-name {
      color: var(--accent);
    }
  }
  
  &__author-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  
  &__display-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  &__meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  &__dot {
    opacity: 0.5;
  }
  
  &__content {
    padding: 0 18px 12px;
    cursor: pointer;
  }
  
  &__media-single {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    
    &:hover::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(255, 45, 85, 0.05);
    }
  }
  
  &__media-grid {
    display: grid;
    gap: 2px;
    cursor: pointer;
    
    &--2 { grid-template-columns: repeat(2, 1fr); }
    &--3 { grid-template-columns: repeat(2, 1fr); grid-template-rows: 180px 180px; }
    &--4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: 180px 180px; }
    
    .post-card__media-item {
      position: relative;
      overflow: hidden;
      
      &:nth-child(1) when --3 {
        grid-row: span 2;
      }
    }
  }
  
  &__media-item {
    position: relative;
    
    .media-preview {
      width: 100%;
      height: 100%;
    }
    
    :deep(img), :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    &:hover :deep(img), &:hover :deep(video) {
      transform: scale(1.03);
    }
  }
  
  &__media-more {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 15, 0.6);
    font-size: 28px;
    font-weight: 700;
    color: white;
  }
  
  &__footer {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    flex-direction: row;
    gap: 4px;
  }
  
  &__actions {
    position: relative;
  }
  
  &__menu {
    right: 0;
    top: 100%;
  }
}
</style>