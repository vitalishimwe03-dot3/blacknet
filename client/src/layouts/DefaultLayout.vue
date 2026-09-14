<template>
  <div class="app-shell">
    <div class="matrix-bg" aria-hidden="true"></div>
    
    <!-- Desktop sidebar -->
    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <SidebarNav @close="sidebarOpen = false" />
    </aside>
    
    <!-- Mobile sidebar overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>
    
    <!-- Main content -->
    <main class="main-content" :class="{ 'main-content--shifted': !isAuthPage }">
      <router-view />
    </main>
    
    <!-- Mobile top bar -->
    <header class="mobile-header">
      <Logo />
      <div class="mobile-header__actions">
        <top-level-button @click="sidebarOpen = true" />
        <avatar-link />
      </div>
    </header>
    
    <!-- Mobile bottom nav -->
    <MobileNav />
    
    <!-- Toasts -->
    <ToastContainer />
    
    <!-- Sidebar toggle for desktop -->
    <button class="sidebar-toggle" :aria-expanded="sidebarOpen" aria-label="Toggle navigation" @click="sidebarOpen = !sidebarOpen">
      <i class="bn-icon">☰</i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Logo from '@/components/common/Logo.vue'
import SidebarNav from '@/components/navigation/SidebarNav.vue'
import MobileNav from '@/components/navigation/MobileNav.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const sidebarOpen = ref(false)
const isAuthPage = ref(false)

let pollTimer = null

onMounted(() => {
  router.afterEach((to) => {
    sidebarOpen.value = false
  })
  
  if (authStore.isAuthenticated) {
    startPolling()
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function startPolling() {
  notificationStore.fetchCounts()
  pollTimer = setInterval(() => {
    if (authStore.isAuthenticated) {
      notificationStore.fetchCounts()
    }
  }, 30000)
}
</script>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  position: relative;
}

.main-content {
  margin-left: 280px;
  padding-bottom: 80px;
  
  @media (max-width: 1024px) {
    margin-left: 72px;
  }
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding-bottom: 70px;
  }
}

.mobile-header {
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 45, 85, 0.15);
  }
}

.sidebar-overlay {
  display: none;
}

.sidebar-toggle {
  display: none;
}
</style>