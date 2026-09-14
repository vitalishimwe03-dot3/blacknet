<template>
  <div v-if="message.type === 'system'" class="text-center py-2">
    <span class="text-xs text-bn-muted font-mono bg-bn-surface/50 px-3 py-1 rounded-full">{{ message.content }}</span>
  </div>
  <div v-else class="flex gap-3 hover:bg-bn-surface/20 p-2 -mx-2 rounded-lg transition-colors">
    <div class="w-8 h-8 rounded-full bg-bn-surface flex items-center justify-center text-[10px] font-mono text-bn-accent border border-bn-border flex-shrink-0">
      {{ getInitials(message.sender_display_name || message.sender_username || message.anon_name || '?') }}
    </div>
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-bn-text">
          {{ message.sender_display_name || message.sender_username || message.anon_name }}
        </span>
        <span v-if="message.anon_name" class="text-[10px] text-bn-muted font-mono">anonymous</span>
        <span class="text-[10px] text-bn-muted font-mono">{{ formatShortTime(message.created_at) }}</span>
      </div>
      <p class="text-sm text-bn-text mt-0.5 break-words">{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup>
import { getInitials, formatShortTime } from '../../utils/helpers'

defineProps({
  message: { type: Object, required: true },
})
</script>