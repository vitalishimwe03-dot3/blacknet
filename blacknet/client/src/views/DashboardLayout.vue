<template>
  <div class="flex h-screen overflow-hidden relative z-10">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/50 z-40 lg:hidden" @click="sidebarOpen = false"></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-bn-dark border-r border-bn-border flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-bn-border">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-bn-accent to-bn-cyan flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-bn-black" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div>
          <h1 class="font-bold text-gradient font-mono text-lg leading-none">BlackNet</h1>
          <p class="text-[10px] text-bn-muted font-mono mt-0.5">SECURE NETWORK</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ active: isActive(item.to) }"
          @click="sidebarOpen = false"
        >
          <span class="text-lg" v-html="item.icon"></span>
          <span class="font-mono text-sm">{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto badge badge-accent text-[10px]">{{ item.badge }}</span>
        </router-link>

        <div class="pt-4 pb-2 px-3">
          <p class="text-[10px] text-bn-muted font-mono uppercase tracking-widest">Community</p>
        </div>

        <router-link
          v-for="item in communityItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ active: isActive(item.to) }"
          @click="sidebarOpen = false"
        >
          <span class="text-lg" v-html="item.icon"></span>
          <span class="font-mono text-sm">{{ item.label }}</span>
        </router-link>

        <template v-if="auth.isModerator">
          <div class="pt-4 pb-2 px-3">
            <p class="text-[10px] text-bn-muted font-mono uppercase tracking-widest">Admin</p>
          </div>
          <router-link to="/moderation" class="sidebar-link" :class="{ active: isActive('/moderation') }" @click="sidebarOpen = false">
            <span class="text-lg">&#9881;</span>
            <span class="font-mono text-sm">Moderation</span>
          </router-link>
        </template>
      </nav>

      <!-- User section -->
      <div class="p-3 border-t border-bn-border">
        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-bn-surface/50 transition-colors cursor-pointer" @click="router.push('/settings')">
          <div class="w-8 h-8 rounded-full bg-bn-accent/20 border border-bn-accent/30 flex items-center justify-center text-xs font-mono text-bn-accent font-bold">
            {{ getInitials(auth.user?.display_name || auth.user?.username) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-bn-text truncate">{{ auth.user?.display_name || auth.user?.username }}</p>
            <p class="text-[10px] text-bn-muted font-mono">{{ auth.user?.role }}</p>
          </div>
          <span class="text-bn-green text-xs" title="Online">&#9679;</span>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="h-16 flex items-center px-4 lg:px-6 border-b border-bn-border bg-bn-dark/80 backdrop-blur-sm flex-shrink-0">
        <button @click="sidebarOpen = true" class="lg:hidden p-2 rounded-lg hover:bg-bn-surface mr-2 text-bn-muted">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <div class="flex-1 max-w-md">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bn-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input v-model="searchQuery" type="text" class="input pl-10 py-2 text-sm font-mono bg-bn-surface/50" placeholder="Search BlackNet..." @keydown.enter="handleSearch" />
          </div>
        </div>

        <div class="flex items-center gap-2 ml-4">
          <!-- Notifications -->
          <button class="relative p-2 rounded-lg hover:bg-bn-surface transition-colors text-bn-muted hover:text-bn-text" @click="toggleNotifications">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span v-if="notifications.unreadCount > 0" class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-bn-red rounded-full text-[9px] text-white flex items-center justify-center font-mono">
              {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
            </span>
          </button>

          <!-- Settings -->
          <router-link to="/settings" class="p-2 rounded-lg hover:bg-bn-surface transition-colors text-bn-muted hover:text-bn-text">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </router-link>

          <button @click="handleLogout" class="p-2 rounded-lg hover:bg-bn-red/10 transition-colors text-bn-muted hover:text-bn-red" title="Logout">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <router-view />
      </main>
    </div>

    <!-- Notifications panel -->
    <Transition name="slide">
      <div v-if="showNotifications" class="fixed right-0 top-0 h-full w-80 bg-bn-dark border-l border-bn-border z-50 flex flex-col">
        <div class="h-16 flex items-center justify-between px-4 border-b border-bn-border">
          <h3 class="font-mono font-semibold text-bn-text">Notifications</h3>
          <div class="flex items-center gap-2">
            <button @click="notifications.markAllRead()" class="text-xs text-bn-accent font-mono hover:underline">Mark all read</button>
            <button @click="showNotifications = false" class="p-1 rounded hover:bg-bn-surface text-bn-muted">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="notifications.notifications.length === 0" class="p-6 text-center text-bn-muted text-sm font-mono">No notifications</div>
          <div v-for="n in notifications.notifications" :key="n.id"
            class="p-4 border-b border-bn-border hover:bg-bn-surface/30 transition-colors cursor-pointer"
            :class="{ 'bg-bn-accent/5': !n.is_read }"
            @click="notifications.markRead(n.id)"
          >
            <p class="text-sm font-medium" :class="n.is_read ? 'text-bn-muted' : 'text-bn-text'">{{ n.title }}</p>
            <p class="text-xs text-bn-muted mt-1">{{ n.message }}</p>
            <p class="text-[10px] text-bn-muted/60 mt-1 font-mono">{{ timeAgo(n.created_at) }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { getInitials, timeAgo } from '../utils/helpers'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const notifications = useNotificationStore()
const sidebarOpen = ref(false)
const showNotifications = ref(false)
const searchQuery = ref('')

const navItems = [
  { to: '/', label: 'Dashboard', icon: '&#9632;' },
  { to: '/messages', label: 'Messages', icon: '&#9993;' },
  { to: '/channels', label: 'Channels', icon: '&#35;' },
  { to: '/chat-rooms', label: 'Chat Rooms', icon: '&#9783;' },
]

const communityItems = [
  { to: '/forums', label: 'Forums', icon: '&#9776;' },
  { to: '/communities', label: 'Communities', icon: '&#9734;' },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    notifications.fetchNotifications()
  }
}

function handleSearch() {
  if (searchQuery.value) {
    router.push({ path: '/messages', query: { search: searchQuery.value } })
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

onMounted(() => {
  notifications.fetchUnreadCount()
  setInterval(() => notifications.fetchUnreadCount(), 30000)
})
</script>

<style scoped>
.sidebar-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-bn-muted hover:text-bn-text hover:bg-bn-surface/50 transition-all duration-200;
}
.sidebar-link.active {
  @apply bg-bn-accent/10 text-bn-accent border-l-2 border-bn-accent;
}
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>
