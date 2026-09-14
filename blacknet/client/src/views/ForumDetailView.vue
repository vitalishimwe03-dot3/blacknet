<template>
  <div class="p-4 lg:p-6 space-y-6">
    <button @click="router.push('/forums')" class="text-bn-accent text-sm font-mono hover:underline">&larr; Back to Forums</button>

    <div v-if="forum" class="card p-5 glow-border">
      <h1 class="text-xl font-bold text-bn-text">{{ forum.name }}</h1>
      <p class="text-sm text-bn-muted mt-1">{{ forum.description }}</p>
    </div>

    <div class="flex items-center justify-between">
      <h2 class="font-semibold text-bn-text font-mono text-sm">Categories</h2>
    </div>

    <div class="grid gap-4">
      <div v-for="cat in forum?.categories" :key="cat.id" class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="font-semibold text-bn-text">{{ cat.name }}</h3>
            <p class="text-xs text-bn-muted mt-0.5">{{ cat.description || 'No description' }}</p>
          </div>
          <button @click="startThread(cat)" class="btn-secondary font-mono text-xs">+ New Thread</button>
        </div>

        <div class="space-y-2">
          <div v-for="thread in threads[cat.id]" :key="thread.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-bn-surface/30 hover:bg-bn-surface/50 cursor-pointer transition-colors"
            @click="router.push(`/forums/thread/${thread.id}`)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span v-if="thread.is_pinned" class="text-bn-yellow text-xs">&#128204;</span>
                <span v-if="thread.is_locked" class="text-bn-red text-xs">&#128274;</span>
                <p class="text-sm font-medium text-bn-text truncate">{{ thread.title }}</p>
              </div>
              <p class="text-xs text-bn-muted font-mono mt-1">by {{ thread.author_username }} &middot; {{ thread.post_count || 0 }} posts &middot; {{ thread.view_count || 0 }} views</p>
            </div>
            <span class="text-xs text-bn-muted font-mono whitespace-nowrap">{{ timeAgo(thread.updated_at) }}</span>
          </div>
          <div v-if="!threads[cat.id]?.length" class="text-xs text-bn-muted font-mono text-center py-3">No threads yet</div>
        </div>
      </div>
    </div>

    <!-- New thread modal -->
    <Transition name="modal">
      <div v-if="showThread" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showThread = false">
        <div class="card p-6 w-full max-w-lg glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">New Thread</h3>
          <div class="space-y-3">
            <input v-model="threadForm.title" class="input font-mono text-sm" placeholder="Thread title" />
            <textarea v-model="threadForm.content" class="input font-mono text-sm h-32 resize-none" placeholder="Post content"></textarea>
            <div class="flex gap-2 pt-2">
              <button @click="createThread" class="btn-primary flex-1 font-mono text-sm">Create Thread</button>
              <button @click="showThread = false" class="btn-secondary font-mono text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { timeAgo } from '../utils/helpers'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()
const forum = ref(null)
const threads = ref({})
const showThread = ref(false)
const threadForm = ref({ title: '', content: '', categoryId: null })

async function fetchData() {
  const { data } = await api.get(`/forums/${route.params.slug}`)
  forum.value = data.forum
  for (const cat of data.forum.categories) {
    const { data: tData } = await api.get(`/forums/category/${cat.id}/threads`)
    threads.value[cat.id] = tData.threads
  }
}

function startThread(cat) {
  threadForm.value = { title: '', content: '', categoryId: cat.id }
  showThread.value = true
}

async function createThread() {
  if (!threadForm.value.title || !threadForm.value.content) return
  await api.post('/forums/thread', threadForm.value)
  showThread.value = false
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
