<template>
  <div class="min-h-screen flex items-center justify-center px-4 relative z-10">
    <!-- Floating particles -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div v-for="i in 30" :key="i" class="particle" :style="{
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        '--tx': (Math.random() - 0.5) * 200 + 'px',
        '--ty': -(Math.random() * 300 + 100) + 'px',
        '--duration': (Math.random() * 10 + 5) + 's',
        '--delay': (Math.random() * 8) + 's',
      }"></div>
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-bn-accent to-bn-cyan flex items-center justify-center">
            <svg class="w-7 h-7 text-bn-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gradient font-mono tracking-tight">BlackNet</h1>
        </div>
        <p class="text-bn-muted text-sm font-mono">[ secure_communities.init() ]</p>
      </div>

      <!-- Login Card -->
      <div class="card p-8 glow-border">
        <h2 class="text-xl font-semibold text-bn-text mb-6 flex items-center gap-2">
          <span class="text-bn-accent font-mono text-sm">01</span> Authentication
        </h2>

        <div v-if="error" class="mb-4 p-3 rounded-lg bg-bn-red/10 border border-bn-red/30 text-bn-red text-sm font-mono">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm text-bn-muted mb-1.5 font-mono">Username or Email</label>
            <input v-model="login" type="text" class="input font-mono" placeholder="root@blacknet" required autocomplete="username" />
          </div>
          <div>
            <label class="block text-sm text-bn-muted mb-1.5 font-mono">Password</label>
            <input v-model="password" type="password" class="input font-mono" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" :disabled="loading" class="btn-primary w-full font-mono">
            <span v-if="loading" class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/></svg>
              Authenticating...
            </span>
            <span v-else>access.init()</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/register" class="text-bn-accent hover:text-bn-accent-dim text-sm font-mono transition-colors">
            [create_account] &rarr;
          </router-link>
        </div>
      </div>

      <p class="text-center text-bn-muted/40 text-xs mt-6 font-mono">
        Encrypted communication platform v1.0
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const login = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(login.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || 'Authentication failed'
  } finally {
    loading.value = false
  }
}
</script>
