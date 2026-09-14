<template>
  <div class="min-h-screen bg-bn-black relative">
    <div class="matrix-bg"></div>
    <div class="scanline"></div>
    <div class="hex-pattern fixed inset-0 z-0"></div>
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

onMounted(async () => {
  await auth.checkAuth()
})
</script>
