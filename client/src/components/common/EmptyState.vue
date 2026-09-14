<template>
  <div class="state-block" :class="`state-block--${type}`">
    <div class="state-block__icon" aria-hidden="true">
      <svg v-if="type === 'empty'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <svg v-else-if="type === 'network'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
      <svg v-else-if="type === 'storage'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      <svg v-else-if="type === 'lock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    </div>
    
    <h3 class="state-block__title">{{ title }}</h3>
    <p class="state-block__message">{{ message }}</p>
    
    <button v-if="actionLabel" class="btn btn--primary btn--sm" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'empty' },
  title: { type: String, default: 'Nothing here' },
  message: { type: String, default: 'There is nothing to show yet.' },
  actionLabel: { type: String, default: '' }
})
defineEmits(['action'])
</script>

<style scoped lang="scss">
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  gap: 6px;
  
  &--error {
    border: 1px solid rgba(255, 45, 85, 0.2);
    border-radius: 14px;
    background: rgba(255, 45, 85, 0.03);
  }
  
  &__icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    color: var(--text-secondary);
    
    &--danger { color: var(--accent); }
    
    svg { width: 100%; height: 100%; }
  }
  
  &__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  
  &__message {
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 400px;
    margin: 0 0 16px;
    line-height: 1.5;
  }
}
</style>