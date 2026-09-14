<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-terminal terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">blacknet-auth --forgot-password</span>
        </div>
        <div class="terminal-window__body">
          <div class="auth-logs">
            <div class="log-line">
              <span class="log-line__time">[SYSTEM]</span>
              <span class="log-line__level log-line__level--warning">WARN</span>
              <span class="log-line__message">Password recovery protocol initiated</span>
            </div>
          </div>

          <div v-if="sent" class="auth-success">
            <span class="terminal-prompt"></span> If an account exists with that email, a reset link has been dispatched. Check your inbox.
          </div>

          <form v-else @submit.prevent="handleSubmit" class="auth-form">
            <div v-if="error" class="auth-error">
              <span class="terminal-prompt"></span> {{ error }}
            </div>

            <p class="text-secondary" style="margin-bottom: 20px; font-family: var(--font-code); font-size: 13px;">
              Enter the email associated with your account to receive a recovery token.
            </p>

            <div class="form-group">
              <label class="form-label terminal-prompt">email</label>
              <div class="terminal-input glow-border">
                <span class="terminal-input__prefix">$&gt;</span>
                <input
                  v-model="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <button type="submit" class="btn-hacker btn-hacker--solid btn-hacker--block" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>[ SEND RECOVERY TOKEN ]</span>
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
import { ref } from 'vue'
import api from '@/services/api'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function handleSubmit() {
  loading.value = true
  error.value = ''
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    sent.value = true
  } catch (err) {
    error.value = err.message || 'Failed to process request'
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
  margin-bottom: 16px;
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
.auth-logs {
  margin-bottom: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-green);
}
</style>
