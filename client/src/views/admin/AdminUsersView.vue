<template>
  <div class="page">
    <div class="section-header">
      <span class="section-header__title">// admin_users</span>
      <span class="section-header__line"></span>
    </div>

    <div class="terminal-input glow-border" style="margin-bottom: 20px;">
      <span class="terminal-input__prefix">grep -i</span>
      <input v-model="search" type="text" placeholder="search users..." @input="fetchUsers" />
    </div>

    <div v-if="loading" class="loading-spinner">Scanning user nodes...</div>

    <div v-else class="users-table">
      <div v-for="user in users" :key="user.id" class="user-row hacker-card">
        <Avatar :src="user.avatar" :name="user.display_name || user.username" size="sm" :verified="user.is_verified" />
        <div class="user-row__info">
          <span class="user-row__name">{{ user.display_name || user.username }}</span>
          <span class="user-row__username">@{{ user.username }}</span>
          <span class="user-row__email">{{ user.email }}</span>
        </div>
        <span class="status-badge" :class="user.is_suspended ? 'status-badge--offline' : 'status-badge--online'">
          {{ user.is_suspended ? 'SUSPENDED' : user.role }}
        </span>
        <div class="user-row__actions">
          <button class="btn-hacker btn-hacker--sm" @click="toggleSuspend(user)">
            {{ user.is_suspended ? 'UNSUSPEND' : 'SUSPEND' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Avatar from '@/components/common/Avatar.vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const toast = useToastStore()
const users = ref([])
const loading = ref(true)
const search = ref('')

async function fetchUsers() {
  loading.value = true
  try {
    const res = await api.get('/admin/users', { params: { search: search.value } })
    users.value = res.data.users || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function toggleSuspend(user) {
  try {
    await api.put(`/admin/users/${user.id}/suspend`, {
      suspended: !user.is_suspended,
      reason: user.is_suspended ? '' : 'Suspended by admin'
    })
    user.is_suspended = !user.is_suspended
    toast.success(user.is_suspended ? 'Node suspended' : 'Node restored')
  } catch (err) {
    toast.error(err.message || 'Failed')
  }
}

onMounted(fetchUsers)
</script>

<style lang="scss" scoped>
.users-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-weight: 600;
    font-size: 14px;
  }

  &__username {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--green);
    margin-right: 8px;
  }

  &__email {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  &__actions {
    display: flex;
    gap: 6px;
  }
}
</style>
