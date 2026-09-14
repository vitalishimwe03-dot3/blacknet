import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
        { path: 'explore', name: 'explore', component: () => import('@/views/ExploreView.vue') },
        { path: 'search', name: 'search', component: () => import('@/views/SearchView.vue') },
        { path: 'create', name: 'create', component: () => import('@/views/CreatePostView.vue'), meta: { requiresAuth: true } },
        { path: 'messages', name: 'messages', component: () => import('@/views/messages/MessagesView.vue'), meta: { requiresAuth: true } },
        { path: 'messages/:userId', name: 'message-thread', component: () => import('@/views/messages/MessageThreadView.vue'), meta: { requiresAuth: true } },
        { path: 'notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue'), meta: { requiresAuth: true } },
        { path: 'bookmarks', name: 'bookmarks', component: () => import('@/views/BookmarksView.vue'), meta: { requiresAuth: true } },
        { path: 'storage', name: 'storage', component: () => import('@/views/StorageView.vue'), meta: { requiresAuth: true } },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { requiresAuth: true } },
        { path: 'u/:username', name: 'profile', component: () => import('@/views/ProfileView.vue') },
        { path: 'post/:id', name: 'post', component: () => import('@/views/PostDetailView.vue') },
        { path: 'hashtag/:name', name: 'hashtag', component: () => import('@/views/HashtagView.vue') },
        { path: 'admin', name: 'admin', component: () => import('@/views/admin/AdminDashboardView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/users', name: 'admin-users', component: () => import('@/views/admin/AdminUsersView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/posts', name: 'admin-posts', component: () => import('@/views/admin/AdminPostsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/reports', name: 'admin-reports', component: () => import('@/views/admin/AdminReportsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
        { path: 'admin/storage', name: 'admin-storage', component: () => import('@/views/admin/AdminStorageView.vue'), meta: { requiresAuth: true, requiresAdmin: true } }
      ]
    },
    {
      path: '/auth',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue') },
        { path: 'register', name: 'register', component: () => import('@/views/auth/RegisterView.vue') },
        { path: 'forgot-password', name: 'forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue') },
        { path: 'reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordView.vue') }
      ]
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'home' }
  }
  
  if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router