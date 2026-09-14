<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-ascii">
<pre class="ascii-art">
╔═══════════════════════════════════╗
║  ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓  ║
║  ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓  ║
║  ▓▓▓    ▓▓▓▓▓  ▓▓▓▓▓     ▓▓▓▓▓  ║
║  ▓▓▓    ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓  ║
║  ▓▓▓    ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓  ║
╚═══════════════════════════════════╝
</pre>
      </div>

      <div class="auth-terminal terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">blacknet-auth --login</span>
        </div>
        <div class="terminal-window__body">
          <div class="auth-logs">
            <div class="log-line">
              <span class="log-line__time">[SYSTEM]</span>
              <span class="log-line__level log-line__level--info">INIT</span>
              <span class="log-line__message">BLACKNET authentication module loaded</span>
            </div>
            <div class="log-line">
              <span class="log-line__time">[SYSTEM]</span>
              <span class="log-line__level log-line__level--success">READY</span>
              <span class="log-line__message">Secure channel established</span>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="auth-form">
            <div v-if="error" class="auth-error">
              <span class="terminal-prompt"></span> {{ error }}
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">identifier</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.login"
                  type="text"
                  placeholder="username or email"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">password</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                />
              </div>
            </div>

            <button type="submit" class="btn-hacker btn-hacker--solid btn-hacker--block" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>[ AUTHENTICATE ]</span>
            </button>
          </form>

          <div class="auth-footer">
            <router-link to="/auth/forgot-password" class="auth-link">Forgot password?</router-link>
            <span class="text-secondary">|</span>
            <router-link to="/auth/register" class="auth-link">Register new node</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const form = ref({ login: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(form.value.login, form.value.password)
    toast.success('Access granted')
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message || 'Authentication failed'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-primary);
}

.auth-container {
  width: 100%;
  max-width: 440px;
}

.auth-ascii {
  text-align: center;
  margin-bottom: 24px;

  .ascii-art {
    display: inline-block;
    font-size: 12px;
  }
}

.auth-form {
  margin-top: 20px;
}

.auth-error {
  padding: 12px 16px;
  background: rgba(255, 45, 85, 0.08);
  border: 1px solid rgba(255, 45, 85, 0.3);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-family: var(--font-code);
  font-size: 13px;
  margin-bottom: 16px;
}

.auth-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  font-size: 13px;
}

.auth-link {
  color: var(--green);
  font-family: var(--font-mono);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    text-shadow: 0 0 8px rgba(0, 214, 138, 0.5);
  }
}

.auth-logs {
  margin-bottom: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-green);
}
</style>
