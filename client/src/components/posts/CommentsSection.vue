<template>
  <div class="comments-section">
    <h3 class="comments-section__title" @click="toggleShow">
      {{ showComments ? 'Hide' : 'Show' }} Comments ({{ comments.length }})
    </h3>

    <template v-if="showComments">
      <div class="comments-section__list">
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <Avatar :src="comment.avatar" :name="comment.display_name || comment.username" size="sm" />
          <div class="comment__body">
            <div class="comment__header">
              <router-link :to="`/u/${comment.username}`" class="comment__author">
                {{ comment.display_name || comment.username }}
              </router-link>
              <span class="comment__time">{{ timeAgo(comment.created_at) }}</span>
            </div>
            <p class="comment__text">{{ comment.content }}</p>
            <div class="comment__actions">
              <button class="comment__action" :class="{ 'comment__action--liked': comment.is_liked }" @click="toggleCommentLike(comment)">
                <svg viewBox="0 0 24 24" :fill="comment.is_liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" width="12" height="12">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{{ comment.likes_count || '' }}</span>
              </button>
              <button class="comment__action" @click="replyingTo = comment.id">
                Reply
              </button>
              <span v-if="canDeleteComment(comment)" class="comment__delete" @click="deleteComment(comment)">Delete</span>
            </div>
            
            <!-- Replies -->
            <div v-if="comment.replies && comment.replies.length" class="comment__replies">
              <div v-for="reply in comment.replies" :key="reply.id" class="comment comment--reply">
                <Avatar :src="reply.avatar" :name="reply.display_name || reply.username" size="xs" />
                <div class="comment__body">
                  <div class="comment__header">
                    <router-link :to="`/u/${reply.username}`" class="comment__author">
                      {{ reply.display_name || reply.username }}
                    </router-link>
                    <span class="comment__time">{{ timeAgo(reply.created_at) }}</span>
                  </div>
                  <p class="comment__text">{{ reply.content }}</p>
                  <div class="comment__actions">
                    <button class="comment__action" :class="{ 'comment__action--liked': reply.is_liked }" @click="toggleCommentLike(reply)">
                      <svg viewBox="0 0 24 24" :fill="reply.is_liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <span v-if="canDeleteComment(reply)" class="comment__delete" @click="deleteComment(reply)">Delete</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Reply form -->
            <form v-if="replyingTo === comment.id" class="comment-form comment-form--reply" @submit.prevent="submitReply(comment)">
              <input v-model="replyContent" class="form-input form-input--sm" placeholder="Write a reply..." aria-label="Reply content" />
              <button type="submit" class="btn btn--primary btn--sm">Reply</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Comment form -->
      <form class="comment-form" @submit.prevent="submitComment">
        <Avatar v-if="authStore.user" :src="authStore.avatar" :name="authStore.displayName" size="sm" />
        <input v-model="commentContent" class="form-input form-input--sm" placeholder="Add a comment..." aria-label="Comment content" />
        <button type="submit" class="btn btn--primary btn--sm" :disabled="!commentContent.trim()">Post</button>
      </form>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import api from '@/services/api'
import { timeAgo } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  postId: { type: String, required: true }
})

const authStore = useAuthStore()
const toastStore = useToastStore()
const comments = ref([])
const showComments = ref(false)
const commentContent = ref('')
const replyContent = ref('')
const replyingTo = ref(null)

onMounted(async () => {
  try {
    const { data } = await api.get(`/comments/post/${props.postId}`)
    comments.value = data.comments
  } catch (err) {
    // Silent fail - comments will remain empty
  }
})

function toggleShow() {
  showComments.value = !showComments.value
}

async function submitComment() {
  const content = commentContent.value.trim()
  if (!content) return
  try {
    const { data } = await api.post('/comments', { postId: props.postId, content })
    comments.value.unshift(data)
    commentContent.value = ''
  } catch (err) {
    toastStore.error(err.message || 'Failed to comment')
  }
}

async function submitReply(comment) {
  const content = replyContent.value.trim()
  if (!content) return
  try {
    const { data } = await api.post('/comments', { postId: props.postId, content, parentId: comment.id })
    if (!comment.replies) comment.replies = []
    comment.replies.push(data)
    replyContent.value = ''
    replyingTo.value = null
  } catch (err) {
    toastStore.error(err.message || 'Failed to reply')
  }
}

async function toggleCommentLike(comment) {
  try {
    const { data } = await api.post(`/comments/${comment.id}/like`)
    comment.is_liked = data.liked
    comment.likes_count = data.likes_count
  } catch (err) {
    toastStore.error(err.message || 'Failed to like comment')
  }
}

function canDeleteComment(comment) {
  return comment.user_id === authStore.user?.id || authStore.isAdmin
}

async function deleteComment(comment) {
  try {
    await api.delete(`/comments/${comment.id}`)
    comments.value = comments.value.filter(c => c.id !== comment.id)
    comments.value.forEach(c => {
      if (c.replies) c.replies = c.replies.filter(r => r.id !== comment.id)
    })
    toastStore.success('Comment deleted')
  } catch (err) {
    toastStore.error(err.message || 'Failed to delete')
  }
}
</script>

<style scoped lang="scss">
.comments-section {
  padding: 16px 18px;
  
  &__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    margin-bottom: 12px;
    
    &:hover {
      color: var(--text-primary);
    }
  }
  
  &__list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 4px;
  }
}

.comment {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  
  &--reply {
    margin-top: 10px;
  }
  
  &__body {
    flex: 1;
    min-width: 0;
  }
  
  &__header {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  
  &__author {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary);
    
    &:hover { color: var(--accent); }
  }
  
  &__time {
    font-size: 11px;
    color: var(--text-secondary);
  }
  
  &__text {
    font-size: 13px;
    line-height: 1.5;
    margin: 4px 0 8px;
    word-break: break-word;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  &__action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.2s;
    
    &:hover { color: var(--text-primary); }
    
    &--liked {
      color: var(--accent);
    }
  }
  
  &__replies {
    margin-top: 8px;
    padding-left: 8px;
    border-left: 2px solid var(--border);
  }
  
  &__delete {
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    
    &:hover {
      color: var(--accent);
    }
  }
}

.comment-form {
  display: flex;
  gap: 10px;
  align-items: center;
  
  &--reply {
    margin-top: 12px;
  }
}
</style>