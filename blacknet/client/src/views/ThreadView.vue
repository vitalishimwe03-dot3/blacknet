<template>
  <div class="p-4 lg:p-6 space-y-6">
    <button @click="router.back()" class="text-bn-accent text-sm font-mono hover:underline">&larr; Back</button>

    <div v-if="thread" class="card p-5 glow-border">
      <div class="flex items-center gap-2 mb-2">
        <span v-if="thread.is_pinned" class="badge badge-yellow text-[10px]">&#128204; Pinned</span>
        <span v-if="thread.is_locked" class="badge badge-red text-[10px]">&#128274; Locked</span>
      </div>
      <h1 class="text-xl font-bold text-bn-text">{{ thread.title }}</h1>
      <p class="text-xs text-bn-muted font-mono mt-1">by {{ thread.author_username }} &middot; {{ thread.view_count }} views</p>
    </div>

    <div class="space-y-4">
      <div v-for="post in posts" :key="post.id" class="card p-5" :class="{ 'border-l-2 border-l-bn-accent': post.reply_to }">
        <div class="flex gap-4">
          <div class="w-10 h-10 rounded-full bg-bn-surface flex items-center justify-center text-xs font-mono text-bn-accent border border-bn-border flex-shrink-0">
            {{ getInitials(post.author_display_name || post.author_username || '?') }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium text-bn-text">{{ post.author_display_name || post.author_username }}</span>
              <span class="text-[10px] text-bn-muted font-mono">{{ timeAgo(post.created_at) }}</span>
              <span v-if="post.is_edited" class="text-[10px] text-bn-muted">(edited)</span>
            </div>
            <p class="text-sm text-bn-text leading-relaxed whitespace-pre-wrap">{{ post.content }}</p>
            <div class="flex gap-3 mt-3">
              <button @click="replyTo = post" class="text-xs text-bn-muted hover:text-bn-accent font-mono transition-colors">Reply</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!thread?.is_locked" class="card p-5">
      <div v-if="replyTo" class="mb-3 p-3 rounded-lg bg-bn-surface/50 border-l-2 border-l-bn-accent">
        <div class="flex items-center justify-between">
          <p class="text-xs text-bn-muted font-mono">Replying to {{ replyTo.author_username }}</p>
          <button @click="replyTo = null" class="text-bn-red text-xs">&#10005;</button>
        </div>
        <p class="text-sm text-bn-text mt-1 truncate">{{ replyTo.content }}</p>
      </div>
      <textarea v-model="newPost" class="input font-mono text-sm h-24 resize-none" placeholder="Write your reply..."></textarea>
      <button @click="submitPost" :disabled="!newPost.trim()" class="btn-primary mt-3 font-mono text-sm">Post Reply</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { timeAgo, getInitials } from '../utils/helpers'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()
const thread = ref(null)
const posts = ref([])
const newPost = ref('')
const replyTo = ref(null)

async function fetchData() {
  const { data } = await api.get(`/forums/thread/${route.params.threadId}`)
  thread.value = data.thread
  posts.value = data.posts
}

async function submitPost() {
  if (!newPost.value.trim()) return
  await api.post(`/forums/thread/${route.params.threadId}/post`, {
    content: newPost.value,
    replyTo: replyTo.value?.id
  })
  newPost.value = ''
  replyTo.value = null
  fetchData()
}

onMounted(fetchData)
</script>
