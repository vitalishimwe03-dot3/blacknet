<template>
  <nav class="mobile-nav" aria-label="Mobile navigation">
    <router-link v-for="item in navItems" :key="item.name" :to="item.to" class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': isActive(item.to) }">
      <span class="mobile-nav__icon" v-html="item.icon"></span>
      <span class="mobile-nav__label">{{ item.label }}</span>
      <span v-if="item.badge && notificationStore.unread > 0" class="mobile-nav__badge">{{ notificationStore.unread }}</span>
      <span v-if="item.badgeMsg && notificationStore.unreadMessages > 0" class="mobile-nav__badge">{{ notificationStore.unreadMessages }}</span>
    </router-link>
    
    <router-link to="/create" class="mobile-nav__create" aria-label="Create post" :class="{ 'mobile-nav__link--active': isActive('/create') }">
      <span class="mobile-nav__icon" v-html="icons.create"></span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11z"/></svg>',
  create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
}

const navItems = computed(() => [
  { to: '/', name: 'home', label: 'Home', icon: icons.home },
  { to: '/explore', name: 'explore', label: 'Explore', icon: icons.explore },
  { to: '/messages', name: 'messages', label: 'Messages', icon: icons.messages, badgeMsg: true },
  { to: '/notifications', name: 'notifications', label: 'Alerts', icon: icons.notifications, badge: true },
  { to: `u/${authStore.user?.username || 'profile'}`, name: 'profile', label: 'Me', icon: icons.profile }
])

function isActive(to) {
  if (to === '/') return route.path === '/'
  if (to.includes('u/')) return route.path.startsWith('/u/')
  return route.path.startsWith(to)
}
</script>

<style scoped lang="scss">
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: none;
  background: rgba(14, 14, 20, 0.97);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 45, 85, 0.2);
  padding: 6px 8px;
  justify-content: space-around;
  align-items: center;
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &__link {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 10px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 10px;
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &--active {
      color: var(--accent);
      
      .mobile-nav__icon svg {
        filter: drop-shadow(0 0 6px rgba(255, 45, 85, 0.5));
      }
    }
  }
  
  &__icon {
    width: 22px;
    height: 22px;
    
    svg {
      width: 100%;
      height: 100%;
    }
  }
  
  &__badge {
    position: absolute;
    top: 2px;
    right: 4px;
    background: var(--accent);
    color: white;
    font-size: 9px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    border-radius: 8px;
    padding: 0 4px;
    box-shadow: 0 0 8px rgba(255, 45, 85, 0.5);
  }
  
  &__create {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), #ff5a7e);
    color: white;
    margin-top: -20px;
    box-shadow: 0 4px 20px rgba(255, 45, 85, 0.4);
    
    .mobile-nav__icon {
      width: 22px;
      height: 22px;
    }
  }
}
</style>