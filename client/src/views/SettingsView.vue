<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// settings</span>
      <span class="section-header__line"></span>
    </div>

    <div class="hacker-card" style="margin-bottom: 20px;">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// avatar</span>
        <span class="section-header__line"></span>
      </div>
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <Avatar :src="user?.avatar" :name="user?.display_name || user?.username" size="xl" />
        <div>
          <label class="btn-hacker btn-hacker--sm" style="cursor: pointer;">
            <input type="file" accept="image/*" style="display: none;" @change="uploadAvatar" :disabled="uploadingAvatar" />
            {{ uploadingAvatar ? 'UPLOADING...' : '[ UPLOAD AVATAR ]' }}
          </label>
          <p class="form-hint" style="margin-top: 4px;">Max 5MB. JPEG, PNG, WebP.</p>
        </div>
      </div>
    </div>

    <div class="hacker-card" style="margin-bottom: 20px;">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// cover_image</span>
        <span class="section-header__line"></span>
      </div>
      <div>
        <label class="btn-hacker btn-hacker--sm" style="cursor: pointer;">
          <input type="file" accept="image/*" style="display: none;" @change="uploadCover" :disabled="uploadingCover" />
          {{ uploadingCover ? 'UPLOADING...' : '[ UPLOAD COVER ]' }}
        </label>
        <p class="form-hint" style="margin-top: 4px;">Max 10MB. Recommended 1200x400.</p>
      </div>
    </div>

    <div class="hacker-card" style="margin-bottom: 20px;">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// profile_config</span>
        <span class="section-header__line"></span>
      </div>

      <form @submit.prevent="updateProfile">
        <div class="form-group">
          <label class="form-label terminal-prompt">display_name</label>
          <div class="terminal-input glow-border">
            <span class="terminal-input__prefix">$&gt;</span>
            <input v-model="form.displayName" type="text" maxlength="50" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label terminal-prompt">bio</label>
          <div class="terminal-input glow-border">
            <span class="terminal-input__prefix">$&gt;</span>
            <textarea v-model="form.bio" rows="3" maxlength="500" style="min-height: 80px;"></textarea>
          </div>
          <span class="form-hint">{{ form.bio.length }}/500</span>
        </div>

        <button type="submit" class="btn-hacker btn-hacker--solid" :disabled="saving">
          {{ saving ? 'ENCRYPTING...' : '[ SAVE CONFIG ]' }}
        </button>
      </form>
    </div>

    <div class="hacker-card" style="margin-bottom: 20px;">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// change_password</span>
        <span class="section-header__line"></span>
      </div>

      <form @submit.prevent="changePassword">
        <div class="form-group">
          <label class="form-label terminal-prompt">current_password</label>
          <div class="terminal-input glow-border">
            <span class="terminal-input__prefix">$&gt;</span>
            <input v-model="pwForm.currentPassword" type="password" required autocomplete="current-password" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label terminal-prompt">new_password</label>
          <div class="terminal-input glow-border">
            <span class="terminal-input__prefix">$&gt;</span>
            <input v-model="pwForm.newPassword" type="password" required minlength="6" autocomplete="new-password" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label terminal-prompt">confirm_password</label>
          <div class="terminal-input glow-border">
            <span class="terminal-input__prefix">$&gt;</span>
            <input v-model="pwForm.confirmPassword" type="password" required minlength="6" autocomplete="new-password" />
          </div>
        </div>

        <button type="submit" class="btn-hacker btn-hacker--solid" :disabled="changingPassword">
          {{ changingPassword ? 'ENCRYPTING...' : '[ UPDATE PASSWORD ]' }}
        </button>
      </form>
    </div>

    <div class="hacker-card" style="margin-bottom: 20px;">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// account_info</span>
        <span class="section-header__line"></span>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-item__label">username</span>
          <span class="info-item__value terminal-prompt">{{ user?.username }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">email</span>
          <span class="info-item__value terminal-prompt">{{ user?.email }}</span>
        </div>
        <div class="info-item">
          <span class="info-item__label">role</span>
          <span class="status-badge" :class="user?.role === 'super_admin' ? 'status-badge--online' : 'status-badge--offline'">
            {{ user?.role }}
          </span>
        </div>
        <div class="info-item">
          <span class="info-item__label">joined</span>
          <span class="info-item__value text-secondary">{{ formatDate(user?.created_at) }}</span>
        </div>
      </div>
    </div>

    <div class="hacker-card">
      <div class="section-header" style="margin-bottom: 16px;">
        <span class="section-header__title">// danger_zone</span>
        <span class="section-header__line"></span>
      </div>
      <div class="log-line">
        <span class="log-line__level log-line__level--warning">WARN</span>
        <span class="log-line__message">Account deletion is irreversible. Contact admin for assistance.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatDate } from '@/utils/format'
import Avatar from '@/components/common/Avatar.vue'
import api from '@/services/api'

const authStore = useAuthStore()
const toast = useToastStore()

const user = ref(authStore.user)
const saving = ref(false)
const form = ref({
  displayName: user.value?.display_name || '',
  bio: user.value?.bio || ''
})

const pwForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const changingPassword = ref(false)
const uploadingAvatar = ref(false)
const uploadingCover = ref(false)

onMounted(() => {
  authStore.fetchUser().then(() => {
    user.value = authStore.user
    form.value.displayName = user.value?.display_name || ''
    form.value.bio = user.value?.bio || ''
  })
})

async function updateProfile() {
  saving.value = true
  try {
    await authStore.updateProfile(form.value)
    toast.success('Configuration updated')
  } catch (err) {
    toast.error(err.message || 'Update failed')
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) {
    return toast.error('Passwords do not match')
  }
  changingPassword.value = true
  try {
    await api.put('/users/me/password', {
      currentPassword: pwForm.value.currentPassword,
      newPassword: pwForm.value.newPassword
    })
    toast.success('Password updated')
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    toast.error(err.message || 'Failed to change password')
  } finally {
    changingPassword.value = false
  }
}

async function uploadAvatar(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    authStore.user.avatar = data.avatar
    user.value = authStore.user
    toast.success('Avatar updated')
  } catch (err) {
    toast.error(err.message || 'Upload failed')
  } finally {
    uploadingAvatar.value = false
    e.target.value = ''
  }
}

async function uploadCover(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingCover.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/users/me/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    authStore.user.cover_image = data.cover_image
    user.value = authStore.user
    toast.success('Cover image updated')
  } catch (err) {
    toast.error(err.message || 'Upload failed')
  } finally {
    uploadingCover.value = false
    e.target.value = ''
  }
}
</script>

<style lang="scss" scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  &__label {
    display: block;
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  &__value {
    font-size: 14px;
  }
}
</style>
