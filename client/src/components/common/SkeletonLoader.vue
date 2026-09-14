<template>
  <div class="skeleton" :class="`skeleton--${type}`" :style="{ width, height }" aria-hidden="true"></div>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'rect' },
  width: { type: String, default: '100%' },
  height: { type: String, default: '16px' }
})
</script>

<style scoped lang="scss">
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  
  &--circle {
    border-radius: 50%;
  }
  
  &--card {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>