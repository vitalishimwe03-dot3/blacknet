<template>
  <div class="avatar" :class="[`avatar--${size}`, { 'avatar--verified': verified }]" :style="avatarStyle" role="img" :aria-label="label" tabindex="0">
    <img v-if="src" :src="avatarSrc" :alt="label" loading="lazy" />
    <span v-else class="avatar__initials">{{ initials }}</span>
    <span v-if="verified" class="avatar__verified" title="Verified account">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.5L21 12l1.8 3.3-3 1.5-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.5L3 12 1.2 8.7l3-1.5 1-3.3 3.4.5L12 2z"/><path d="M9 12l2 2 4-4" stroke="#0a0a0f" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getInitials } from '@/utils/format'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '?' },
  size: { type: String, default: 'md' },
  verified: { type: Boolean, default: false },
  label: { type: String, default: '' }
})

const initials = computed(() => getInitials(props.name))
const avatarSrc = computed(() => {
  if (!props.src) return ''
  if (props.src.startsWith('http') || props.src.startsWith('/')) return props.src
  return `/uploads/avatars/${props.src}`
})
const avatarStyle = computed(() => {
  if (props.src) return {}
  const colors = [
    ['#ff2d55', '#7a0019'],
    ['#00ff88', '#003d1e'],
    ['#00aeff', '#00364f'],
    ['#ff8a00', '#4f2300'],
    ['#b44aff', '#2b004f']
  ]
  const hash = (props.name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const [color, bg] = colors[hash % colors.length]
  return {
    background: `${bg}`,
    border: `1px solid ${color}55`
  }
})
</script>

<style scoped lang="scss">
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: visible;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  &__initials {
    font-family: 'Share Tech Mono', monospace;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 1px;
  }
  
  &__verified {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 18px;
    height: 18px;
    color: #00aeff;
    background: var(--bg-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    
    svg { width: 100%; height: 100%; }
  }
  
  &--xs {
    width: 24px;
    height: 24px;
    .avatar__initials { font-size: 10px; }
  }
  
  &--sm {
    width: 32px;
    height: 32px;
    .avatar__initials { font-size: 12px; }
  }
  
  &--md {
    width: 44px;
    height: 44px;
    .avatar__initials { font-size: 16px; }
  }
  
  &--lg {
    width: 64px;
    height: 64px;
    .avatar__initials { font-size: 22px; }
  }
  
  &--xl {
    width: 96px;
    height: 96px;
    .avatar__initials { font-size: 32px; }
  }
}
</style>