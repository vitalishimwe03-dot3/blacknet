import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    component: () => import('../views/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/DashboardView.vue') },
      { path: 'messages', name: 'Messages', component: () => import('../views/MessagesView.vue') },
      { path: 'messages/:conversationId', name: 'Conversation', component: () => import('../views/MessagesView.vue') },
      { path: 'channels', name: 'Channels', component: () => import('../views/ChannelsView.vue') },
      { path: 'channels/:channelId', name: 'Channel', component: () => import('../views/ChannelView.vue') },
      { path: 'forums', name: 'Forums', component: () => import('../views/ForumsView.vue') },
      { path: 'forums/:slug', name: 'ForumDetail', component: () => import('../views/ForumDetailView.vue') },
      { path: 'forums/thread/:threadId', name: 'Thread', component: () => import('../views/ThreadView.vue') },
      { path: 'communities', name: 'Communities', component: () => import('../views/CommunitiesView.vue') },
      { path: 'communities/:slug', name: 'CommunityDetail', component: () => import('../views/CommunityDetailView.vue') },
      { path: 'chat-rooms', name: 'ChatRooms', component: () => import('../views/ChatRoomsView.vue') },
      { path: 'chat-rooms/:roomId', name: 'ChatRoom', component: () => import('../views/ChatRoomView.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/SettingsView.vue') },
      { path: 'moderation', name: 'Moderation', component: () => import('../views/ModerationView.vue') },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
  } else if (to.meta.guest && auth.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
