<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-ascii">
<pre class="ascii-art">
╔═══════════════════════════════════╗
║     ▓▓▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓    ║
║     ▓▓▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓    ║
║        ▓▓▓   ▓▓▓▓▓     ▓▓▓▓▓    ║
║     ▓▓▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓    ║
║     ▓▓▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓▓▓    ║
╚═══════════════════════════════════╝
</pre>
      </div>

      <div class="auth-terminal terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">blacknet-auth --register</span>
        </div>
        <div class="terminal-window__body">
          <div class="auth-logs">
            <div class="log-line">
              <span class="log-line__time">[SYSTEM]</span>
              <span class="log-line__level log-line__level--info">INIT</span>
              <span class="log-line__message">New node registration sequence started</span>
            </div>
          </div>

          <form @submit.prevent="handleRegister" class="auth-form">
            <div v-if="error" class="auth-error">
              <span class="terminal-prompt"></span> {{ error }}
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">username</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.username"
                  type="text"
                  placeholder="choose a handle"
                  required
                  minlength="3"
                  maxlength="30"
                  autocomplete="username"
                />
              </div>
              <span class="form-hint">3-30 chars, letters numbers underscores</span>
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">email</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">display_name <span class="text-muted">(optional)</span></label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.displayName"
                  type="text"
                  placeholder="how others see you"
                  maxlength="50"
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
                  placeholder="min 6 characters"
                  required
                  minlength="6"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">confirm_password</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="repeat password"
                  required
                  autocomplete="new-password"
                />
              </div>
              <span v-if="form.password && form.confirmPassword && form.password !== form.confirmPassword" class="form-error">
                passwords do not match
              </span>
            </div>

            <button type="submit" class="btn-hacker btn-hacker--solid btn-hacker--block" :disabled="loading || (form.password !== form.confirmPassword)">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>[ CREATE NODE ]</span>
            </button>
          </form>

          <div class="auth-footer">
            <span class="text-secondary">Already have access?</span>
            <router-link to="/auth/login" class="auth-link">Login</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const form = ref({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      displayName: form.value.displayName || undefined
    })
    toast.success('Node created successfully')
    router.push('/')
  } catch (err) {
    error.value = err.message || 'Registration failed'
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
  .ascii-art { display: inline-block; font-size: 12px; }
}

.auth-form { margin-top: 20px; }

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
  &:hover { text-shadow: 0 0 8px rgba(0, 214, 138, 0.5); }
}

.auth-logs {
  margin-bottom: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-green);
}

.text-muted { color: var(--text-muted); }
</style>
