<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast">
      <div v-for="toast in toastStore.toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
        <span class="toast__icon" aria-hidden="true">
          <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </span>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__close" @click="toastStore.remove(toast.id)" aria-label="Dismiss notification">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()
</script>

<style scoped lang="scss">
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  
  @media (max-width: 480px) {
    left: 16px;
    right: 16px;
    top: 12px;
    max-width: none;
  }
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 20, 28, 0.98);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  
  &--success {
    border-color: rgba(0, 255, 136, 0.4);
    .toast__icon { color: var(--green); }
  }
  
  &--error {
    border-color: rgba(255, 45, 85, 0.5);
    .toast__icon { color: var(--accent); }
  }
  
  &--info {
    border-color: rgba(0, 174, 255, 0.4);
    .toast__icon { color: #00aeff; }
  }
  
  &__icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    
    svg { width: 100%; height: 100%; }
  }
  
  &__message {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.4;
  }
  
  &__close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    
    &:hover { color: var(--accent); }
  }
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>