<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// new_transmission</span>
      <span class="section-header__line"></span>
    </div>

    <div class="hacker-card">
      <div class="terminal-window__body" style="padding: 0;">
        <div class="compose-area">
          <div class="terminal-input glow-border" style="border: none; padding: 0;">
            <span class="terminal-input__prefix">cat &gt;&gt; /transmit/</span>
            <textarea
              v-model="content"
              placeholder="type your transmission..."
              rows="6"
              maxlength="10000"
              style="min-height: 150px;"
            ></textarea>
          </div>
        </div>

        <div v-if="uploadedMedia.length" class="media-preview-grid">
          <div v-for="(media, i) in uploadedMedia" :key="i" class="media-preview-item">
            <img v-if="media.category === 'image'" :src="`/uploads/images/${media.filename}`" />
            <div v-else class="media-preview-file">
              <span>{{ media.original_name }}</span>
            </div>
            <button class="media-remove-btn" @click="removeMedia(i)">×</button>
          </div>
        </div>

        <div class="compose-toolbar">
          <div class="compose-toolbar__left">
            <label class="action-btn" style="cursor: pointer;">
              <input type="file" accept="image/*,video/*,audio/*" multiple style="display: none;" @change="handleFileUpload" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span>Media</span>
            </label>

            <select v-model="visibility" class="visibility-select">
              <option value="public">Public</option>
              <option value="followers">Followers Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div class="compose-toolbar__right">
            <span class="char-count" :class="{ 'char-count--warn': content.length > 9000, 'char-count--danger': content.length > 9800 }">
              {{ content.length }}/10000
            </span>
            <button
              class="btn-hacker btn-hacker--solid btn-hacker--sm"
              :disabled="!canPost || posting"
              @click="publishPost"
            >
              {{ posting ? 'ENCRYPTING...' : 'TRANSMIT' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useStorageStore } from '@/stores/storage'
import api from '@/services/api'

const router = useRouter()
const toast = useToastStore()
const storageStore = useStorageStore()

const content = ref('')
const visibility = ref('public')
const posting = ref(false)
const uploadedMedia = ref([])

const canPost = computed(() => content.value.trim() || uploadedMedia.value.length > 0)

async function handleFileUpload(e) {
  const files = Array.from(e.target.files)
  for (const file of files) {
    try {
      const result = await storageStore.uploadFile(file)
      uploadedMedia.value.push(result)
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    }
  }
  e.target.value = ''
}

function removeMedia(index) {
  uploadedMedia.value.splice(index, 1)
}

async function publishPost() {
  posting.value = true
  try {
    await api.post('/posts', {
      content: content.value,
      visibility: visibility.value,
      mediaIds: uploadedMedia.value.map(m => m.id)
    })
    toast.success('Transmission sent')
    router.push('/')
  } catch (err) {
    toast.error(err.message || 'Failed to transmit')
  } finally {
    posting.value = false
  }
}
</script>

<style lang="scss" scoped>
.compose-area {
  padding: 16px 20px;
}

.media-preview-grid {
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
  flex-wrap: wrap;
}

.media-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-green);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.media-preview-file {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  padding: 8px;
  text-align: center;
}

.media-remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: var(--accent);
  border: 1px solid var(--accent);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.compose-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--border-green);

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.visibility-select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-green);
  border-radius: var(--radius-sm);
  color: var(--green);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 10px;
  cursor: pointer;

  option {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.char-count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);

  &--warn { color: var(--warning); }
  &--danger { color: var(--accent); }
}
</style>
