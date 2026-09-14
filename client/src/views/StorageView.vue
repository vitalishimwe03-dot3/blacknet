<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// storage</span>
      <span class="section-header__line"></span>
    </div>

    <div class="terminal-window" style="margin-bottom: 24px;">
      <div class="terminal-window__header">
        <span class="terminal-window__dot terminal-window__dot--green"></span>
        <span class="terminal-window__title">storage.config</span>
      </div>
      <div class="terminal-window__body">
        <div class="storage-info">
          <div class="storage-info__bar">
            <div class="storage-info__fill" :style="{ width: percentage + '%' }"></div>
          </div>
          <div class="storage-info__text">
            <span>{{ storageStore.usedFormatted }} / {{ storageStore.limitFormatted }}</span>
            <span>{{ percentage }}% allocated</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-header">
      <span class="section-header__title">// upload_files</span>
      <span class="section-header__line"></span>
    </div>

    <label class="upload-zone hacker-card" :class="{ 'upload-zone--active': dragging }" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave="dragging = false" @drop.prevent="handleDrop">
      <input type="file" multiple style="display: none;" @change="handleUpload" ref="fileInput" />
      <div class="upload-zone__content">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span class="upload-zone__text">Drop files or click to upload</span>
        <span class="upload-zone__hint">All file types accepted</span>
      </div>
    </label>

    <div v-if="uploading" class="upload-progress">
      <div class="loading-spinner">Uploading... {{ uploadProgress }}%</div>
    </div>

    <div class="section-header" style="margin-top: 24px;">
      <span class="section-header__title">// files ({{ storageStore.files.length }})</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="storageStore.loading" class="loading-spinner">Loading files...</div>

    <div v-else-if="storageStore.files.length === 0" class="terminal-window">
      <div class="terminal-window__header">
        <span class="terminal-window__dot terminal-window__dot--green"></span>
        <span class="terminal-window__title">files.log</span>
      </div>
      <div class="terminal-window__body" style="text-align: center; padding: 40px;">
        <div class="log-line">
          <span class="log-line__level log-line__level--info">INFO</span>
          <span class="log-line__message">No files in storage</span>
        </div>
      </div>
    </div>

    <div v-else class="files-grid">
      <div v-for="file in storageStore.files" :key="file.id" class="file-item hacker-card">
        <div class="file-item__preview">
          <img v-if="file.category === 'image'" :src="`/uploads/images/${file.filename}`" />
          <div v-else class="file-item__icon">
            <span>{{ file.category.toUpperCase().slice(0,3) }}</span>
          </div>
        </div>
        <div class="file-item__info">
          <span class="file-item__name">{{ file.original_name }}</span>
          <span class="file-item__size">{{ formatBytes(file.file_size) }}</span>
        </div>
        <button class="btn-hacker btn-hacker--danger btn-hacker--sm" @click="deleteFile(file.id)">DEL</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStorageStore, formatBytes } from '@/stores/storage'
import { useToastStore } from '@/stores/toast'

const storageStore = useStorageStore()
const toast = useToastStore()

const fileInput = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)

const percentage = computed(() => storageStore.percentage)

onMounted(() => {
  storageStore.fetchStats()
  storageStore.fetchFiles()
})

function handleUpload(e) {
  uploadFiles(Array.from(e.target.files))
  e.target.value = ''
}

function handleDrop(e) {
  dragging.value = false
  uploadFiles(Array.from(e.dataTransfer.files))
}

async function uploadFiles(files) {
  for (const file of files) {
    uploading.value = true
    try {
      await storageStore.uploadFile(file, (p) => { uploadProgress.value = p })
      toast.success(`Uploaded: ${file.name}`)
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }
  storageStore.fetchStats()
  storageStore.fetchFiles()
}

async function deleteFile(fileId) {
  try {
    await storageStore.deleteFile(fileId)
    toast.success('File deleted')
    storageStore.fetchStats()
  } catch (err) {
    toast.error(err.message || 'Delete failed')
  }
}
</script>

<style lang="scss" scoped>
.storage-info {
  &__bar {
    height: 8px;
    background: var(--bg-primary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--green), var(--green-bright));
    border-radius: 4px;
    transition: width 0.3s ease;
    box-shadow: 0 0 8px rgba(0, 214, 138, 0.4);
  }

  &__text {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.upload-zone {
  display: block;
  text-align: center;
  cursor: pointer;
  padding: 40px;
  border: 2px dashed var(--border-green);
  transition: all 0.2s ease;

  &:hover, &--active {
    border-color: var(--green);
    background: rgba(0, 214, 138, 0.03);
  }

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--green);
  }

  &__text {
    font-family: var(--font-mono);
    font-size: 14px;
  }

  &__hint {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.files-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;

  &__preview {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-green);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__icon {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--green);
    text-transform: uppercase;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }
}

.upload-progress {
  margin-top: 16px;
}
</style>
