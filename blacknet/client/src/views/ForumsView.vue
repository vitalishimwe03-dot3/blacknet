<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-bn-text font-mono">&#9776; Forums</h1>
        <p class="text-sm text-bn-muted font-mono">Discussion boards and threads</p>
      </div>
      <button @click="showCreate = true" class="btn-primary font-mono text-sm">+ New Forum</button>
    </div>

    <div class="grid gap-4">
      <div v-for="forum in forums" :key="forum.id" class="card-hover cursor-pointer" @click="router.push(`/forums/${forum.slug}`)">
        <div class="p-5">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-bn-purple/10 border border-bn-purple/20 flex items-center justify-center text-xl text-bn-purple">
              &#9776;
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-bn-text text-lg">{{ forum.name }}</h3>
              <p class="text-sm text-bn-muted mt-1">{{ forum.description || 'No description' }}</p>
              <div class="flex items-center gap-4 mt-3">
                <span class="text-xs text-bn-muted font-mono">{{ forum.thread_count || 0 }} threads</span>
                <span class="text-xs text-bn-muted font-mono">{{ forum.mod_count || 0 }} moderators</span>
                <span v-if="forum.is_public" class="badge badge-accent text-[10px]">Public</span>
                <span v-else class="badge badge-yellow text-[10px]">Private</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <Transition name="modal">
      <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showCreate = false">
        <div class="card p-6 w-full max-w-lg glow-border max-h-[80vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">Create Forum</h3>
          <div class="space-y-3">
            <input v-model="form.name" class="input font-mono text-sm" placeholder="Forum name" />
            <textarea v-model="form.description" class="input font-mono text-sm h-20 resize-none" placeholder="Description"></textarea>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-bn-muted">
                <input type="checkbox" v-model="form.isPublic" class="accent-bn-accent" /> Public
              </label>
              <label class="flex items-center gap-2 text-sm text-bn-muted">
                <input type="checkbox" v-model="form.requiresApproval" class="accent-bn-accent" /> Requires approval
              </label>
            </div>
            <div>
              <p class="text-sm text-bn-muted mb-2">Categories</p>
              <div v-for="(cat, i) in form.categories" :key="i" class="flex gap-2 mb-2">
                <input v-model="cat.name" class="input font-mono text-sm flex-1" placeholder="Category name" />
                <input v-model="cat.description" class="input font-mono text-sm flex-1" placeholder="Description" />
                <button @click="form.categories.splice(i, 1)" class="text-bn-red p-2">&#10005;</button>
              </div>
              <button @click="form.categories.push({ name: '', description: '' })" class="text-bn-accent text-sm font-mono">+ Add category</button>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="createForum" class="btn-primary flex-1 font-mono text-sm">Create</button>
              <button @click="showCreate = false" class="btn-secondary font-mono text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
const forums = ref([])
const showCreate = ref(false)
const form = ref({ name: '', description: '', isPublic: true, requiresApproval: false, categories: [{ name: 'General', description: '' }] })

async function fetchForums() {
  const { data } = await api.get('/forums')
  forums.value = data.forums
}

async function createForum() {
  if (!form.value.name) return
  await api.post('/forums', form.value)
  showCreate.value = false
  fetchForums()
}

onMounted(fetchForums)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
