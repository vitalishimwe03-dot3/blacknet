<template>
  <div class="p-4 lg:p-6 max-w-2xl space-y-6">
    <h1 class="text-xl font-bold text-bn-text font-mono">&#9881; Settings</h1>

    <!-- Profile -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Profile</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-bn-muted font-mono mb-1">Display Name</label>
          <input v-model="profile.displayName" class="input font-mono text-sm" />
        </div>
        <div>
          <label class="block text-xs text-bn-muted font-mono mb-1">Bio</label>
          <textarea v-model="profile.bio" class="input font-mono text-sm h-20 resize-none" placeholder="Tell us about yourself..."></textarea>
        </div>
        <div>
          <label class="block text-xs text-bn-muted font-mono mb-1">Avatar URL</label>
          <input v-model="profile.avatarUrl" class="input font-mono text-sm" placeholder="https://..." />
        </div>
        <button @click="saveProfile" class="btn-primary font-mono text-sm">Save Profile</button>
      </div>
    </div>

    <!-- Password -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Change Password</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-bn-muted font-mono mb-1">Current Password</label>
          <input v-model="pw.current" type="password" class="input font-mono text-sm" />
        </div>
        <div>
          <label class="block text-xs text-bn-muted font-mono mb-1">New Password</label>
          <input v-model="pw.new" type="password" class="input font-mono text-sm" minlength="8" />
        </div>
        <button @click="changePassword" class="btn-primary font-mono text-sm">Update Password</button>
      </div>
    </div>

    <!-- Privacy & Security -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Privacy & Security</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between py-2 border-b border-bn-border/50">
          <div>
            <p class="text-sm text-bn-text">End-to-End Encryption</p>
            <p class="text-xs text-bn-muted">Placeholder - not yet implemented</p>
          </div>
          <span class="badge badge-yellow">Placeholder</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-bn-border/50">
          <div>
            <p class="text-sm text-bn-text">Session Management</p>
            <p class="text-xs text-bn-muted">Active sessions and logout</p>
          </div>
          <span class="badge badge-accent">Active</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-bn-border/50">
          <div>
            <p class="text-sm text-bn-text">Two-Factor Authentication</p>
            <p class="text-xs text-bn-muted">Additional login security</p>
          </div>
          <span class="badge badge-red">Not implemented</span>
        </div>
      </div>
    </div>

    <!-- Block list -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-4">Blocked Users</h2>
      <div class="flex gap-2">
        <input v-model="blockUsername" class="input font-mono text-sm flex-1" placeholder="Username to block" />
        <button @click="blockUser" class="btn-danger font-mono text-sm">Block</button>
      </div>
    </div>

    <div v-if="msg" class="p-3 rounded-lg bg-bn-accent/10 border border-bn-accent/20 text-bn-accent text-sm font-mono">
      {{ msg }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const auth = useAuthStore()
const profile = ref({ displayName: '', bio: '', avatarUrl: '' })
const pw = ref({ current: '', new: '' })
const blockUsername = ref('')
const msg = ref('')

onMounted(() => {
  if (auth.user) {
    profile.value = {
      displayName: auth.user.display_name || '',
      bio: auth.user.bio || '',
      avatarUrl: auth.user.avatar_url || ''
    }
  }
})

async function saveProfile() {
  try {
    await auth.updateProfile(profile.value)
    msg.value = 'Profile updated!'
    setTimeout(() => msg.value = '', 3000)
  } catch (e) {
    msg.value = e.response?.data?.error || 'Failed to update'
  }
}

async function changePassword() {
  if (!pw.value.current || !pw.value.new) return
  try {
    await api.put('/auth/password', { currentPassword: pw.value.current, newPassword: pw.value.new })
    pw.value = { current: '', new: '' }
    msg.value = 'Password changed!'
    setTimeout(() => msg.value = '', 3000)
  } catch (e) {
    msg.value = e.response?.data?.error || 'Failed'
  }
}

async function blockUser() {
  if (!blockUsername.value) return
  try {
    const { data } = await api.get(`/users/search?q=${blockUsername.value}`)
    if (data.users.length > 0) {
      await api.post(`/users/block/${data.users[0].id}`)
      blockUsername.value = ''
      msg.value = 'User blocked'
    }
  } catch (e) {
    msg.value = 'Failed to block user'
  }
}
</script>
