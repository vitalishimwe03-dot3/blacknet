<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-terminal terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">blacknet-auth --reset-password</span>
        </div>
        <div class="terminal-window__body">
          <div v-if="success" class="auth-success">
            <span class="terminal-prompt"></span> Password reset successfully. Redirecting to login...
          </div>

          <form v-else @submit.prevent="handleSubmit" class="auth-form">
            <div v-if="error" class="auth-error">
              <span class="terminal-prompt"></span> {{ error }}
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">reset_token</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.token"
                  type="text"
                  placeholder="paste your reset token"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label terminal-prompt">new_password</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="form.password"
                  type="password"
                  placeholder="min 6 characters"
                  required
                  minlength="6"
                />
              </div>
            </div>

            <button type="submit" class="btn-hacker btn-hacker--solid btn-hacker--block" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>[ RESET PASSWORD ]</span>
            </button>
          </form>

          <div class="auth-footer">
            <router-link to="/auth/login" class="auth-link">Back to login</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()

const form = ref({ token: '', password: '' })
const loading = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  if (route.query.token) {
    form.value.token = route.query.token
  }
})

async function handleSubmit() {
  loading.value = true
  error.value = ''
  try {
    await api.post('/auth/reset-password', { token: form.value.token, password: form.value.password })
    success.value = true
    setTimeout(() => router.push('/auth/login'), 2000)
  } catch (err) {
    error.value = err.message || 'Reset failed'
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
}
.auth-container { width: 100%; max-width: 440px; }
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
.auth-success {
  padding: 12px 16px;
  background: rgba(0, 214, 138, 0.08);
  border: 1px solid rgba(0, 214, 138, 0.3);
  border-radius: var(--radius-sm);
  color: var(--green);
  font-family: var(--font-code);
  font-size: 13px;
}
.auth-footer {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  font-size: 13px;
}
.auth-link {
  color: var(--green);
  font-family: var(--font-mono);
  text-decoration: none;
  &:hover { text-shadow: 0 0 8px rgba(0, 214, 138, 0.5); }
}
</style>
