<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// admin_dashboard</span>
      <span class="section-header__line"></span>
      <span class="status-badge status-badge--online">SYS_ADMIN</span>
    </div>

    <div v-if="loading" class="loading-spinner">Loading system diagnostics...</div>

    <template v-else>
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card hacker-card">
          <span class="stat-card__value neon-glow">{{ stat.value }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
          <span class="stat-card__icon">{{ stat.icon }}</span>
        </div>
      </div>

      <div class="section-header" style="margin-top: 24px;">
        <span class="section-header__title">// recent_activity</span>
        <span class="section-header__line"></span>
      </div>

      <div class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">system.log</span>
        </div>
        <div class="terminal-window__body">
          <div v-for="log in recentLogs" :key="log" class="log-line">
            <span class="log-line__time">[{{ log.time }}]</span>
            <span class="log-line__level" :class="`log-line__level--${log.level}`">{{ log.level.toUpperCase() }}</span>
            <span class="log-line__message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <div class="admin-nav" style="margin-top: 24px;">
        <router-link to="/admin/users" class="admin-nav__item hacker-card">
          <span class="admin-nav__icon">>></span>
          <span>User Management</span>
        </router-link>
        <router-link to="/admin/posts" class="admin-nav__item hacker-card">
          <span class="admin-nav__icon">>></span>
          <span>Post Moderation</span>
        </router-link>
        <router-link to="/admin/reports" class="admin-nav__item hacker-card">
          <span class="admin-nav__icon">>></span>
          <span>Reports</span>
        </router-link>
        <router-link to="/admin/storage" class="admin-nav__item hacker-card">
          <span class="admin-nav__icon">>></span>
          <span>Storage Monitor</span>
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const loading = ref(true)
const stats = ref([])
const recentLogs = ref([])

onMounted(async () => {
  try {
    const res = await api.get('/admin/stats')
    const d = res.data
    stats.value = [
      { label: 'TOTAL NODES', value: d.totalUsers || 0, icon: '>>' },
      { label: 'TRANSMISSIONS', value: d.totalPosts || 0, icon: '//' },
      { label: 'ACTIVE TODAY', value: d.activeToday || 0, icon: '**' },
      { label: 'PENDING REPORTS', value: d.pendingReports || 0, icon: '!!' },
      { label: 'TOTAL STORAGE', value: formatBytes(d.totalStorage || 0), icon: '##' },
      { label: 'TOTAL FILES', value: d.totalFiles || 0, icon: '@@' }
    ]
    recentLogs.value = (d.recentActivity || []).map(a => ({
      time: new Date(a.created_at).toLocaleTimeString(),
      level: a.type === 'like' ? 'success' : a.type === 'follow' ? 'info' : 'info',
      message: `${a.from_username || 'system'} - ${a.type}`
    }))
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  position: relative;

  &__value {
    display: block;
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 700;
    color: var(--green-bright);
    margin-bottom: 4px;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
  }

  &__icon {
    position: absolute;
    top: 8px;
    right: 10px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: rgba(0, 214, 138, 0.2);
  }
}

.admin-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    text-decoration: none;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 14px;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--green);
      box-shadow: 0 0 15px rgba(0, 214, 138, 0.1);
    }
  }

  &__icon {
    color: var(--green);
    font-weight: 700;
  }
}
</style>
