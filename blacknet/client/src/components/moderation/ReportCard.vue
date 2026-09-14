<template>
  <div class="card p-4">
    <div class="flex items-start justify-between">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span :class="statusClasses" class="badge text-[10px]">{{ report.status }}</span>
          <span class="text-xs text-bn-muted font-mono">{{ report.reason }}</span>
          <span v-if="report.target_type" class="text-[10px] text-bn-muted font-mono bg-bn-surface px-1.5 py-0.5 rounded">{{ report.target_type }}</span>
        </div>
        <p class="text-sm text-bn-text mt-1 break-words">{{ report.description || 'No description' }}</p>
        <p class="text-xs text-bn-muted font-mono mt-1">
          Reported by {{ report.reporter_username }} &middot; against {{ report.reported_username }} &middot; {{ timeAgo(report.created_at) }}
        </p>
      </div>
      <div class="flex gap-1 flex-shrink-0" v-if="report.status === 'pending'">
        <button @click="$emit('update', report.id, 'resolved')" class="text-xs text-bn-green hover:underline font-mono">Resolve</button>
        <button @click="$emit('update', report.id, 'dismissed')" class="text-xs text-bn-muted hover:underline font-mono">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { timeAgo } from '../../utils/helpers'

const props = defineProps({
  report: { type: Object, required: true },
})

defineEmits(['update'])

const statusClasses = computed(() => {
  const map = {
    pending: 'badge-yellow',
    reviewed: 'badge-cyan',
    resolved: 'badge-accent',
    dismissed: 'badge-red',
  }
  return map[props.report.status] || 'badge-yellow'
})
</script>