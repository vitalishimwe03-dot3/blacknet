<template>
  <div class="p-4 lg:p-6 space-y-6">
    <button @click="router.push('/communities')" class="text-bn-accent text-sm font-mono hover:underline">&larr; Back</button>

    <div v-if="community" class="card p-6 glow-border">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold text-bn-text">{{ community.name }}</h1>
          <p class="text-sm text-bn-muted mt-1">{{ community.description }}</p>
          <div class="flex items-center gap-3 mt-2">
            <span class="text-xs text-bn-muted font-mono">{{ community.members?.length }} members</span>
            <span v-if="community.is_public" class="badge badge-accent text-[10px]">Public</span>
            <span v-else class="badge badge-yellow text-[10px]">Private</span>
          </div>
        </div>
        <div v-if="community.myRole === 'admin'" class="flex gap-2">
          <button @click="showInvite = true" class="btn-secondary font-mono text-xs">Generate Invite</button>
        </div>
      </div>
    </div>

    <!-- Members -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Members</h2>
      <div class="grid gap-2">
        <div v-for="m in community?.members" :key="m.id" class="flex items-center gap-3 p-3 rounded-lg bg-bn-surface/30">
          <div class="w-9 h-9 rounded-full bg-bn-surface flex items-center justify-center text-xs font-mono text-bn-accent border border-bn-border relative">
            {{ getInitials(m.display_name || m.username) }}
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bn-card" :class="getStatusColor(presence.isOnline(m.id))"></span>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-bn-text">{{ m.display_name || m.username }}</p>
              <span :class="getRoleBadge(m.role).class" class="text-[10px]">{{ getRoleBadge(m.role).label }}</span>
            </div>
            <p class="text-xs text-bn-muted font-mono">@{{ m.username }}</p>
          </div>
          <div v-if="community.myRole === 'admin' && m.id !== auth.user?.id" class="flex gap-1">
            <button @click="changeRole(m)" class="text-xs text-bn-muted hover:text-bn-accent font-mono">Role</button>
            <button @click="removeMember(m)" class="text-xs text-bn-muted hover:text-bn-red font-mono">Remove</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite codes -->
    <div v-if="community?.myRole === 'admin'" class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Invite Codes</h2>
      <p class="text-xs text-bn-muted font-mono">Use "Join by Code" to enter these: <span class="text-bn-accent">/communities</span></p>
    </div>

    <!-- Invite modal -->
    <Transition name="modal">
      <div v-if="showInvite" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showInvite = false">
        <div class="card p-6 w-full max-w-md glow-border">
          <h3 class="text-lg font-semibold text-bn-text mb-4 font-mono">Generate Invite</h3>
          <div class="space-y-3">
            <input v-model.number="inviteForm.maxUses" type="number" class="input font-mono text-sm" placeholder="Max uses" />
            <input v-model.number="inviteForm.expiresInDays" type="number" class="input font-mono text-sm" placeholder="Expires in days (0 = never)" />
            <div class="flex gap-2 pt-2">
              <button @click="generateInvite" class="btn-primary flex-1 font-mono text-sm">Generate</button>
              <button @click="showInvite = false" class="btn-secondary font-mono text-sm">Cancel</button>
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
import { useAuthStore } from '../stores/auth'
import { usePresenceStore } from '../stores/presence'
import { getSocket } from '../utils/socket'
import { getInitials, getRoleBadge, getStatusColor } from '../utils/helpers'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const presence = usePresenceStore()
const community = ref(null)
const showInvite = ref(false)
const inviteForm = ref({ maxUses: 5, expiresInDays: 30 })

async function fetchCommunity() {
  try {
    const { data } = await api.get(`/communities/${route.params.slug}`)
    community.value = data.community
  } catch (e) {
    if (e.response?.status === 403) {
      alert('Invite required to view this community')
      router.push('/communities')
    }
  }
}

async function generateInvite() {
  const { data } = await api.post(`/communities/${community.value.id}/invite`, inviteForm.value)
  alert(`Invite code: ${data.invite.code}`)
  showInvite.value = false
}

async function changeRole(m) {
  const roles = ['member', 'moderator', 'admin']
  const current = roles.indexOf(m.role)
  const newRole = roles[(current + 1) % roles.length]
  await api.put(`/communities/${community.value.id}/member/${m.id}/role`, { role: newRole })
  fetchCommunity()
}

async function removeMember(m) {
  if (!confirm(`Remove ${m.username}?`)) return
  await api.delete(`/communities/${community.value.id}/member/${m.id}`)
  fetchCommunity()
}

onMounted(() => {
  getSocket()
  fetchCommunity()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
