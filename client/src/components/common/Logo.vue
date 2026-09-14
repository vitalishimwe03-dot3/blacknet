<template>
  <div class="bn-logo" @click="goHome">
    <svg class="bn-logo__mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="none" stroke="#ff2d55" stroke-width="1.5"/>
      <path d="M8 9h16v3H8z" fill="#ff2d55"/>
      <path d="M8 15h10v3H8z" fill="#00ff88"/>
      <path d="M8 21h13v3H8z" fill="#ff2d55" opacity="0.7"/>
      <circle class="bn-logo__pulse" cx="24" cy="6" r="1.5" fill="#00ff88"/>
    </svg>
    <span class="bn-logo__text">BLACK<span class="bn-logo__accent">NET</span></span>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<style scoped lang="scss">
.bn-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  
  &__mark {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  
  &__text {
    font-family: 'Share Tech Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-primary);
  }
  
  &__accent {
    color: var(--accent);
    text-shadow: 0 0 12px rgba(255, 45, 85, 0.5);
  }
  
  &__pulse {
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>