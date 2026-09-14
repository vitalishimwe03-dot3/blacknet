<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-bn-text font-mono">&#9734; Communities</h1>
        <p class="text-sm text-bn-muted font-mono">Private and invite-only groups</p>
      </div>
      <div class="flex gap-2">
        <button @click="showJoin = true" class="btn-secondary font-mono text-sm">Join by Code</button>
        <button @click="showCreate = true" class="btn-primary font-mono text-sm">+ Create</button>
      </div>
    </div>

    <!-- My communities -->
    <div v-if="myCommunities.length">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-3">Your Communities</h2>
      <div class="grid lg:grid-cols-2 gap-3">
        <div v-for="c in myCommunities" :key="c.id" class="card-hover p-4 cursor-pointer" @click="router.push(`/communities/${c.slug}`)">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-bn-yellow/10 border border-bn-yellow/20 flex items-center justify-center text-bn-yellow font-mono">
              &#9734;
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-bn-text">{{ c.name }}</h3>
              <p class="text-xs text-bn-muted font-mono">{{ c.member_count }} members &middot; {{ c.my_role }}</p>
            </div>
            <span class="badge badge-accent text-[10px]">Member</span>
          </div>
        </div>
      </div>
    </div>

    <!-- All public communities -->
    <div>
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-3">Public Communities</h2>
      <div class="grid lg:grid-cols-2 gap-3">
        <div v-for="c in communities" :key="c.id" class="card-hover p-4 cursor-pointer" @click="router.push(`/communities/${c.slug}`)">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-bn-cyan/10 border border-bn-cyan/20 flex items-center justify-center text-bn-cyan font-mono">
              &#9734;
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-bn-text">{{ c.name }}</h3>
              <p class="text-xs text-bn-muted mt-0.5 truncate">{{ c.description || 'No description' }}</p>
              <p class="text-xs text-bn-muted font-mono mt-1">{{ c.member_count }} members</p>
            </div>
          </div>
        </div>
        <div v-if="!communities.length" class="text-sm text-bn-muted font-mono text-center p-6 card">No public communities</div>
      </div>
    </div>

    <!-- Create modal -->
    <Transition name="modal">
      <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showCreate = false">
        <div class="card p-6 w-full max-w-md glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">Create Community</h3>
          <div class="space-y-3">
            <input v-model="form.name" class="input font-mono text-sm" placeholder="Community name" />
            <textarea v-model="form.description" class="input font-mono text-sm h-20 resize-none" placeholder="Description"></textarea>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-bn-muted">
                <input type="checkbox" v-model="form.isPublic" class="accent-bn-accent" /> Public
              </label>
              <label class="flex items-center gap-2 text-sm text-bn-muted">
                <input type="checkbox" v-model="form.requiresInvite" class="accent-bn-accent" /> Requires invite
              </label>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="createCommunity" class="btn-primary flex-1 font-mono text-sm">Create</button>
              <button @click="showCreate = false" class="btn-secondary font-mono text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Join modal -->
    <Transition name="modal">
      <div v-if="showJoin" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showJoin = false">
        <div class="card p-6 w-full max-w-md glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">Join by Invite Code</h3>
          <div class="space-y-3">
            <input v-model="joinCode" class="input font-mono text-sm" placeholder="Enter invite code" />
            <div class="flex gap-2 pt-2">
              <button @click="joinByCode" class="btn-primary flex-1 font-mono text-sm">Join</button>
              <button @click="showJoin = false" class="btn-secondary font-mono text-sm">Cancel</button>
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
const communities = ref([])
const myCommunities = ref([])
const showCreate = ref(false)
const showJoin = ref(false)
const form = ref({ name: '', description: '', isPublic: false, requiresInvite: true })
const joinCode = ref('')

async function fetchAll() {
  const [allRes, myRes] = await Promise.all([
    api.get('/communities'),
    api.get('/communities/my')
  ])
  communities.value = allRes.data.communities
  myCommunities.value = myRes.data.communities
}

async function createCommunity() {
  if (!form.value.name) return
  await api.post('/communities', form.value)
  showCreate.value = false
  fetchAll()
}

async function joinByCode() {
  try {
    const { data } = await api.get(`/communities/invite/${joinCode.value}`)
    showJoin.value = false
    router.push(`/communities/${data.slug}`)
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to join')
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
