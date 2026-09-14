<template>
  <nav class="sidebar-nav" aria-label="Main navigation">
    <div class="sidebar-nav__logo">
      <Logo />
    </div>
    
    <div class="sidebar-nav__links">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.to"
        class="nav-link"
        :class="{ 'nav-link--active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        @click="$emit('close')"
      >
        <span class="nav-link__icon" v-html="item.icon"></span>
        <span class="nav-link__label">{{ item.label }}</span>
        <span v-if="item.badge && badgeCount > 0" class="nav-link__badge">{{ badgeCount }}</span>
        <span v-if="item.badgeMsg && notificationStore.unreadMessages > 0" class="nav-link__badge">
          {{ notificationStore.unreadMessages }}
        </span>
      </router-link>
      
      <template v-if="authStore.isAdmin">
        <div class="sidebar-nav__divider">ADMIN</div>
        <router-link to="/admin" class="nav-link nav-link--admin" @click="$emit('close')">
          <span class="nav-link__icon" v-html="iconShield"></span>
          <span class="nav-link__label">Admin Panel</span>
        </router-link>
      </template>
    </div>
    
    <div class="sidebar-nav__footer">
      <div class="sidebar-nav__storage" @click="router.push('/storage')">
        <div class="storage-bar">
          <div class="storage-bar__fill" :style="{ width: storagePercentage + '%' }"></div>
        </div>
        <span class="storage-label">{{ storageUsed }} / {{ storageTotal }}</span>
      </div>
      
      <button class="nav-link nav-link--logout" @click="handleLogout">
        <span class="nav-link__icon" v-html="iconLogout"></span>
        <span class="nav-link__label">Logout</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Logo from '@/components/common/Logo.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useStorageStore } from '@/stores/storage'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const storageStore = useStorageStore()

const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  bookmarks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
}

const navItems = computed(() => [
  { to: '/', name: 'home', label: 'Home', icon: icons.home },
  { to: '/explore', name: 'explore', label: 'Explore', icon: icons.explore },
  { to: '/search', name: 'search', label: 'Search', icon: icons.search },
  { to: '/create', name: 'create', label: 'Create', icon: icons.create },
  { to: '/messages', name: 'messages', label: 'Messages', icon: icons.messages, badgeMsg: true },
  { to: '/notifications', name: 'notifications', label: 'Notifications', icon: icons.notifications, badge: true },
  { to: '/bookmarks', name: 'bookmarks', label: 'Bookmarks', icon: icons.bookmarks },
  { to: `u/${authStore.user?.username || 'profile'}`, name: 'profile', label: 'Profile', icon: icons.profile },
  { to: '/settings', name: 'settings', label: 'Settings', icon: icons.settings }
])

const iconShield = icons.shield
const iconLogout = icons.logout

const badgeCount = computed(() => notificationStore.unread)
const storagePercentage = computed(() => storageStore.percentage)
const storageUsed = computed(() => storageStore.usedFormatted)
const storageTotal = computed(() => storageStore.limitFormatted)

function isActive(to) {
  if (to === '/') return route.path === '/'
  if (to.includes('u/')) return route.path.startsWith('/u/')
  return route.path.startsWith(to)
}

function handleLogout() {
  authStore.logout()
  router.push('/auth/login')
}
</script>

<style scoped lang="scss">
.sidebar-nav {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 16px;
  
  &__logo {
    padding: 4px 12px;
    margin-bottom: 30px;
  }
  
  &__links {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  &__divider {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: #5f6b7a;
    padding: 12px 12px 4px;
  }
  
  &__storage {
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    border: 1px solid rgba(0, 255, 136, 0.1);
    border-radius: 8px;
    background: rgba(0, 255, 136, 0.03);
  }
  
  &__footer {
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: none;
  background: none;
  width: 100%;
  color: var(--text-secondary);
  font-size: 15px;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
  text-decoration: none;
  position: relative;
  
  &__icon {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
      width: 100%;
      height: 100%;
    }
  }
  
  &__label {
    flex: 1;
    font-weight: 500;
  }
  
  &__badge {
    background: var(--accent);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
    box-shadow: 0 0 10px rgba(255, 45, 85, 0.4);
  }
  
  &:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.03);
    .nav-link__icon svg {
      filter: drop-shadow(0 0 4px rgba(255, 45, 85, 0.5));
    }
  }
  
  &--active {
    color: var(--accent);
    background: rgba(255, 45, 85, 0.08);
    border: 1px solid transparent;
    box-shadow: inset 0 0 20px rgba(255, 45, 85, 0.05);
    
    &::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 24px;
      background: var(--accent);
      border-radius: 0 3px 3px 0;
      box-shadow: 0 0 8px rgba(255, 45, 85, 0.6);
    }
  }
  
  &--admin {
    border-left: 2px solid var(--accent);
  }
  
  &--logout {
    color: #a0525f;
    
    &:hover {
      background: rgba(255, 45, 85, 0.08);
      color: var(--accent);
    }
  }
}

.storage-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
  
  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--green), #00ff88);
    border-radius: 2px;
    transition: width 0.5s ease;
    box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
  }
}

.storage-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: var(--green);
}
</style>