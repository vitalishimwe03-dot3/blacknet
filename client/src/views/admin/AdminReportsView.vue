<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// admin_reports</span>
      <span class="section-header__line"></span>
    </div>

    <div class="tabs" style="margin-bottom: 20px;">
      <button class="tabs__tab" :class="{ 'tabs__tab--active': filter === 'pending' }" @click="filter = 'pending'; fetchReports()">Pending</button>
      <button class="tabs__tab" :class="{ 'tabs__tab--active': filter === 'reviewed' }" @click="filter = 'reviewed'; fetchReports()">Reviewed</button>
      <button class="tabs__tab" :class="{ 'tabs__tab--active': filter === 'resolved' }" @click="filter = 'resolved'; fetchReports()">Resolved</button>
      <button class="tabs__tab" :class="{ 'tabs__tab--active': filter === 'dismissed' }" @click="filter = 'dismissed'; fetchReports()">Dismissed</button>
    </div>

    <div v-if="loading" class="loading-spinner">Loading reports...</div>

    <template v-else>
      <div v-if="reports.length === 0" class="terminal-window">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">reports.log</span>
        </div>
        <div class="terminal-window__body" style="text-align: center; padding: 40px;">
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">No reports with status: {{ filter }}</span>
          </div>
        </div>
      </div>

      <div v-else class="reports-list">
        <div v-for="report in reports" :key="report.id" class="report-item hacker-card">
          <div class="report-item__header">
            <span class="report-item__id">#{{ report.id.slice(0, 8) }}</span>
            <span class="status-badge" :class="statusClass(report.status)">{{ report.status }}</span>
            <span class="report-item__time">{{ timeAgo(report.created_at) }}</span>
          </div>
          <div class="report-item__reason">
            <span class="terminal-prompt" style="font-size: 12px;"></span> {{ report.reason }}
          </div>
          <div v-if="report.description" class="report-item__desc">{{ report.description }}</div>
          <div class="report-item__meta">
            <span>Reporter: {{ report.reporter_username }}</span>
            <span v-if="report.reported_username">Reported: {{ report.reported_username }}</span>
          </div>
          <div class="report-item__actions" v-if="report.status === 'pending'">
            <button class="btn-hacker btn-hacker--sm" @click="resolveReport(report)">RESOLVE</button>
            <button class="btn-hacker btn-hacker--danger btn-hacker--sm" @click="dismissReport(report)">DISMISS</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { timeAgo } from '@/utils/format'
import api from '@/services/api'

const toast = useToastStore()
const reports = ref([])
const loading = ref(true)
const filter = ref('pending')

async function fetchReports() {
  loading.value = true
  try {
    const res = await api.get('/admin/reports', { params: { status: filter.value } })
    reports.value = res.data.reports || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function resolveReport(report) {
  try {
    await api.put(`/admin/reports/${report.id}/resolve`, { status: 'resolved' })
    report.status = 'resolved'
    toast.success('Report resolved')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

async function dismissReport(report) {
  try {
    await api.put(`/admin/reports/${report.id}/resolve`, { status: 'dismissed' })
    report.status = 'dismissed'
    toast.success('Report dismissed')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

function statusClass(status) {
  const map = { pending: 'status-badge--warning', reviewed: 'status-badge--online', resolved: 'status-badge--online', dismissed: 'status-badge--offline' }
  return map[status] || ''
}

onMounted(fetchReports)
</script>

<style lang="scss" scoped>
.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  padding: 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  &__id {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  &__time {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  &__reason {
    font-family: var(--font-code);
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  &__desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  &__meta {
    display: flex;
    gap: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 12px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
