<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// admin_storage</span>
      <span class="section-header__line"></span>
    </div>

    <div v-if="loading" class="loading-spinner">Scanning storage nodes...</div>

    <template v-else>
      <div class="storage-overview hacker-card" style="margin-bottom: 24px;">
        <div class="section-header" style="margin-bottom: 12px;">
          <span class="section-header__title">// storage_overview</span>
          <span class="section-header__line"></span>
        </div>
        <div class="storage-info">
          <div class="storage-info__bar">
            <div class="storage-info__fill" :style="{ width: storagePercentage + '%' }"></div>
          </div>
          <div class="storage-info__text">
            <span>{{ formatBytes(stats.totalStorage) }} total</span>
            <span>{{ stats.totalFiles }} files</span>
          </div>
        </div>
      </div>

      <div class="section-header">
        <span class="section-header__title">// file_inventory</span>
        <span class="section-header__line"></span>
      </div>

      <div v-if="files.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">storage.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No files in storage</span>
          </div>
        </div>
      </div>

      <div v-else class="files-list">
        <div v-for="file in files" :key="file.id" class="file-row hacker-card">
          <div class="file-row__icon">{{ file.category.slice(0, 3).toUpperCase() }}</div>
          <div class="file-row__info">
            <span class="file-row__name">{{ file.original_name }}</span>
            <span class="file-row__meta">{{ file.username }} - {{ formatBytes(file.file_size) }} - {{ timeAgo(file.created_at) }}</span>
          </div>
          <button class="btn-hacker btn-hacker--danger btn-hacker--sm" @click="deleteFile(file)">DEL</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const toast = useToastStore()
const stats = ref({ totalStorage: 0, totalFiles: 0 })
const files = ref([])
const loading = ref(true)

const storagePercentage = computed(() => {
  const limit = 10 * 1024 * 1024 * 1024
  return Math.min(100, (stats.value.totalStorage / limit) * 100)
})

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function fetchData() {
  loading.value = true
  try {
    const [statsRes, filesRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/files')
    ])
    stats.value = statsRes.data
    files.value = filesRes.data.files || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function deleteFile(file) {
  try {
    await api.delete(`/files/${file.id}`)
    files.value = files.value.filter(f => f.id !== file.id)
    stats.value.totalStorage -= file.file_size
    stats.value.totalFiles--
    toast.success('File deleted')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.storage-info {
  &__bar {
    height: 10px;
    background: var(--bg-primary);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--green), var(--green-bright));
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 214, 138, 0.4);
  }

  &__text {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;

  &__icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 214, 138, 0.08);
    border: 1px solid var(--border-green);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--green);
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

  &__meta {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }
}
</style>
