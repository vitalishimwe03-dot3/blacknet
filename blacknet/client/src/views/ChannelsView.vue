<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-bn-text font-mono"># Channels</h1>
        <p class="text-sm text-bn-muted font-mono">IRC-style real-time channels</p>
      </div>
      <button @click="showCreate = true" class="btn-primary font-mono text-sm">+ Create Channel</button>
    </div>

    <div class="grid gap-3">
      <div v-for="ch in channels" :key="ch.id"
        class="card-hover p-4 cursor-pointer"
        @click="joinAndGo(ch)"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-bn-cyan/10 border border-bn-cyan/20 flex items-center justify-center text-xl font-mono text-bn-cyan">
            #
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-bn-text">{{ ch.name }}</h3>
              <span v-if="ch.is_member" class="badge badge-accent text-[10px]">Joined</span>
              <span v-else class="badge badge-cyan text-[10px]">Public</span>
            </div>
            <p class="text-sm text-bn-muted truncate mt-0.5">{{ ch.description || 'No description' }}</p>
            <div v-if="ch.topic" class="text-xs text-bn-accent/60 font-mono mt-1">Topic: {{ ch.topic }}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-sm font-mono text-bn-text">{{ ch.member_count }}</p>
            <p class="text-[10px] text-bn-muted font-mono">members</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <Transition name="modal">
      <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showCreate = false">
        <div class="card p-6 w-full max-w-md glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">Create Channel</h3>
          <div class="space-y-3">
            <input v-model="form.name" class="input font-mono text-sm" placeholder="Channel name (e.g. #dev-chat)" />
            <input v-model="form.description" class="input font-mono text-sm" placeholder="Description" />
            <input v-model="form.topic" class="input font-mono text-sm" placeholder="Channel topic" />
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.isPublic" id="public" class="accent-bn-accent" />
              <label for="public" class="text-sm text-bn-muted">Public channel</label>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="createChannel" class="btn-primary flex-1 font-mono text-sm">Create</button>
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
const channels = ref([])
const showCreate = ref(false)
const form = ref({ name: '', description: '', topic: '', isPublic: true })

async function fetchChannels() {
  const { data } = await api.get('/channels')
  channels.value = data.channels
}

async function joinAndGo(ch) {
  if (!ch.is_member) {
    await api.post(`/channels/${ch.id}/join`)
  }
  router.push(`/channels/${ch.id}`)
}

async function createChannel() {
  if (!form.value.name) return
  await api.post('/channels', form.value)
  showCreate.value = false
  form.value = { name: '', description: '', topic: '', isPublic: true }
  fetchChannels()
}

onMounted(fetchChannels)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
