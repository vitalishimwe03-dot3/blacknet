<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Welcome header -->
    <div class="card p-6 glow-border relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-r from-bn-accent/5 to-bn-cyan/5"></div>
      <div class="relative z-10">
        <h1 class="text-2xl font-bold text-bn-text mb-1">
          Welcome back, <span class="text-gradient font-mono">{{ auth.user?.display_name || auth.user?.username }}</span>
        </h1>
        <p class="text-bn-muted font-mono text-sm">System status: <span class="text-bn-green">OPERATIONAL</span> | Encryption: <span class="text-bn-cyan">AES-256</span></p>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="card p-4 hover:border-bn-accent/20 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" :class="stat.bgClass">
            <span v-html="stat.icon"></span>
          </div>
          <div>
            <p class="text-xl font-bold font-mono text-bn-text">{{ stat.value }}</p>
            <p class="text-xs text-bn-muted font-mono">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent activity -->
      <div class="card p-5">
        <h2 class="text-sm font-semibold text-bn-text mb-4 flex items-center gap-2">
          <span class="text-bn-accent font-mono">&#9656;</span> Quick Actions
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <router-link to="/messages" class="p-4 rounded-lg bg-bn-surface/50 border border-bn-border hover:border-bn-accent/30 hover:shadow-glow-sm transition-all group">
            <div class="text-2xl mb-2" style="font-variant-emoji: text">&#9993;</div>
            <p class="text-sm font-medium text-bn-text group-hover:text-bn-accent transition-colors">New Message</p>
            <p class="text-xs text-bn-muted font-mono mt-0.5">Encrypt & send</p>
          </router-link>
          <router-link to="/channels" class="p-4 rounded-lg bg-bn-surface/50 border border-bn-border hover:border-bn-cyan/30 hover:shadow-glow-cyan transition-all group">
            <div class="text-2xl mb-2">#</div>
            <p class="text-sm font-medium text-bn-text group-hover:text-bn-cyan transition-colors">Channels</p>
            <p class="text-xs text-bn-muted font-mono mt-0.5">Join discussion</p>
          </router-link>
          <router-link to="/forums" class="p-4 rounded-lg bg-bn-surface/50 border border-bn-border hover:border-bn-purple/30 transition-all group">
            <div class="text-2xl mb-2">&#9776;</div>
            <p class="text-sm font-medium text-bn-text group-hover:text-bn-purple transition-colors">Forums</p>
            <p class="text-xs text-bn-muted font-mono mt-0.5">Browse topics</p>
          </router-link>
          <router-link to="/communities" class="p-4 rounded-lg bg-bn-surface/50 border border-bn-border hover:border-bn-yellow/30 transition-all group">
            <div class="text-2xl mb-2">&#9734;</div>
            <p class="text-sm font-medium text-bn-text group-hover:text-bn-yellow transition-colors">Communities</p>
            <p class="text-xs text-bn-muted font-mono mt-0.5">Private groups</p>
          </router-link>
        </div>
      </div>

      <!-- System info -->
      <div class="card p-5">
        <h2 class="text-sm font-semibold text-bn-text mb-4 flex items-center gap-2">
          <span class="text-bn-cyan font-mono">&#9656;</span> System Info
        </h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-bn-border/50">
            <span class="text-sm text-bn-muted font-mono">Platform</span>
            <span class="text-sm text-bn-text font-mono">BlackNet v1.0.0</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-bn-border/50">
            <span class="text-sm text-bn-muted font-mono">Encryption</span>
            <span class="badge badge-cyan">AES-256-GCM</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-bn-border/50">
            <span class="text-sm text-bn-muted font-mono">Protocol</span>
            <span class="badge badge-accent">E2E Placeholder</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-bn-border/50">
            <span class="text-sm text-bn-muted font-mono">Session</span>
            <span class="text-sm text-bn-green font-mono">Active</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-bn-muted font-mono">Role</span>
            <span :class="roleBadgeClass" class="badge">{{ auth.user?.role }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Security notice -->
    <div class="card p-5 border-l-4 border-l-bn-yellow">
      <div class="flex gap-3">
        <span class="text-xl">&#9888;</span>
        <div>
          <h3 class="text-sm font-semibold text-bn-text mb-1">End-to-End Encryption Notice</h3>
          <p class="text-sm text-bn-muted">
            BlackNet's encryption architecture is currently a <strong class="text-bn-yellow">placeholder</strong>. True end-to-end encryption
            must be implemented and independently audited before messages can be considered secure. Do not rely on
            this platform for sensitive communications until encryption has been properly verified.
          </p>
        </div>
      </div>
    </div>

    <!-- Community rules -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text mb-3 flex items-center gap-2">
        <span class="text-bn-red font-mono">&#9632;</span> Community Rules
      </h2>
      <div class="grid lg:grid-cols-2 gap-2">
        <div v-for="(rule, i) in rules" :key="i" class="flex items-start gap-2 p-2 rounded-lg bg-bn-surface/30">
          <span class="text-bn-accent font-mono text-xs mt-0.5">{{ String(i + 1).padStart(2, '0') }}</span>
          <p class="text-sm text-bn-muted">{{ rule }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const stats = [
  { label: 'Users Online', value: '3', icon: '&#9679;', bgClass: 'bg-bn-green/10 text-bn-green' },
  { label: 'Channels', value: '5', icon: '#', bgClass: 'bg-bn-cyan/10 text-bn-cyan' },
  { label: 'Forum Posts', value: '14', icon: '&#9776;', bgClass: 'bg-bn-purple/10 text-bn-purple' },
  { label: 'Communities', value: '2', icon: '&#9734;', bgClass: 'bg-bn-yellow/10 text-bn-yellow' },
]

const roleBadgeClass = computed(() => {
  const map = { admin: 'badge-red', moderator: 'badge-yellow', user: 'badge-accent' }
  return map[auth.user?.role] || 'badge-accent'
})

const rules = [
  'No marketplace for stolen data, credentials, or personal information',
  'No malware distribution, phishing, or credential theft',
  'No weapons, drugs, or illegal goods marketplaces',
  'No hacking-for-hire or circumventing law enforcement',
  'All users must respect community guidelines and moderator decisions',
  'Report abuse immediately through the built-in reporting system',
]
</script>
