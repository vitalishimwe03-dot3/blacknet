<template>
  <router-view v-if="appReady" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const toastStore = useToastStore()
const appReady = ref(false)

onMounted(async () => {
  try {
    await authStore.fetchUser()
  } catch (e) {
    // Not authenticated, that's fine
  } finally {
    appReady.value = true
  }
})
</script>