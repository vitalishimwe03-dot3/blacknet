<template>
  <div class="p-4 lg:p-6 space-y-6">
    <h1 class="text-xl font-bold text-bn-text font-mono">&#9881; Moderation Dashboard</h1>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" v-if="stats">
      <div v-for="(val, key) in stats" :key="key" class="card p-4 text-center">
        <p class="text-2xl font-bold font-mono text-bn-accent">{{ val }}</p>
        <p class="text-xs text-bn-muted font-mono mt-1">{{ formatStatLabel(key) }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-bn-border">
      <button v-for="tab in tabs" :key="tab.id"
        class="px-4 py-2 text-sm font-mono transition-colors border-b-2"
        :class="activeTab === tab.id ? 'border-bn-accent text-bn-accent' : 'border-transparent text-bn-muted hover:text-bn-text'"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- Reports -->
    <div v-if="activeTab === 'reports'" class="space-y-3">
      <ReportCard
        v-for="r in reports"
        :key="r.id"
        :report="r"
        @update="updateReport"
      />
      <div v-if="!reports.length" class="text-sm text-bn-muted font-mono text-center p-6">No reports</div>
    </div>

    <!-- Users -->
    <div v-if="activeTab === 'users'" class="space-y-2">
      <div v-for="u in users" :key="u.id" class="card p-3 flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-bn-surface flex items-center justify-center text-[10px] font-mono text-bn-accent border border-bn-border">
          {{ getInitials(u.display_name || u.username) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-bn-text">{{ u.display_name || u.username }}</span>
            <span :class="getRoleBadge(u.role).class" class="text-[10px]">{{ getRoleBadge(u.role).label }}</span>
            <span v-if="u.report_count > 0" class="badge badge-red text-[10px]">{{ u.report_count }} reports</span>
          </div>
          <p class="text-xs text-bn-muted font-mono">@{{ u.username }} &middot; {{ u.email }}</p>
        </div>
        <div class="flex gap-1" v-if="u.username !== 'admin'">
          <button @click="cycleRole(u)" class="text-xs text-bn-muted hover:text-bn-accent font-mono">Role</button>
        </div>
      </div>
    </div>

    <!-- Audit Logs -->
    <div v-if="activeTab === 'audit'" class="space-y-2">
      <div v-for="log in auditLogs" :key="log.id" class="card p-3">
        <div class="flex items-center gap-3">
          <span class="badge badge-cyan text-[10px]">{{ log.action }}</span>
          <span class="text-sm text-bn-text">{{ log.admin_username || 'System' }}</span>
          <span class="text-xs text-bn-muted font-mono ml-auto">{{ formatDateTime(log.created_at) }}</span>
        </div>
        <p v-if="log.details" class="text-xs text-bn-muted font-mono mt-1">{{ JSON.stringify(log.details) }}</p>
      </div>
      <div v-if="!auditLogs.length" class="text-sm text-bn-muted font-mono text-center p-6">No audit logs</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { timeAgo, formatDateTime, getInitials, getRoleBadge } from '../utils/helpers'
import api from '../utils/api'
import ReportCard from '../components/moderation/ReportCard.vue'

const stats = ref(null)
const reports = ref([])
const users = ref([])
const auditLogs = ref([])
const activeTab = ref('reports')

const tabs = [
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users' },
  { id: 'audit', label: 'Audit Logs' },
]

function formatStatLabel(key) {
  const map = { users: 'Total Users', messages: 'Total Messages', pendingReports: 'Pending Reports', channels: 'Channels', forums: 'Forums', communities: 'Communities' }
  return map[key] || key
}

async function fetchData() {
  const [statsRes, reportsRes, usersRes, auditRes] = await Promise.all([
    api.get('/moderation/stats'),
    api.get('/moderation/reports'),
    api.get('/moderation/users'),
    api.get('/moderation/audit'),
  ])
  stats.value = statsRes.data.stats
  reports.value = reportsRes.data.reports
  users.value = usersRes.data.users
  auditLogs.value = auditRes.data.logs
}

async function updateReport(id, status) {
  await api.put(`/moderation/reports/${id}`, { status })
  fetchData()
}

async function cycleRole(u) {
  const roles = ['user', 'moderator', 'admin']
  const next = roles[(roles.indexOf(u.role) + 1) % roles.length]
  await api.put(`/moderation/users/${u.id}/role`, { role: next })
  fetchData()
}

onMounted(fetchData)
</script>
