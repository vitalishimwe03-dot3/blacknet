<template>
  <div class="flex gap-3 group" :class="{ 'flex-row-reverse': own }">
    <div class="w-8 h-8 rounded-full bg-bn-surface flex items-center justify-center text-[10px] font-mono text-bn-accent border border-bn-border flex-shrink-0">
      {{ getInitials(message.sender_display_name || message.sender_username || '?') }}
    </div>
    <div class="max-w-[70%]">
      <div class="flex items-center gap-2 mb-1" :class="{ 'flex-row-reverse': own }">
        <span class="text-xs font-medium text-bn-text">{{ message.sender_display_name || message.sender_username }}</span>
        <span class="text-[10px] text-bn-muted font-mono">{{ formatShortTime(message.created_at) }}</span>
        <span v-if="message.is_edited" class="text-[10px] text-bn-muted">(edited)</span>
      </div>
      <div class="p-3 rounded-xl text-sm break-words" :class="own
        ? 'bg-bn-accent/10 border border-bn-accent/20 text-bn-text'
        : 'bg-bn-surface border border-bn-border text-bn-text'"
      >
        <div v-if="message.reply_content" class="mb-1 p-2 rounded bg-bn-black/40 text-xs text-bn-muted border-l-2 border-l-bn-accent">
          &#128257; {{ message.reply_sender_username }}: {{ message.reply_content }}
        </div>
        <template v-if="message.content === '[deleted]'">
          <span class="text-bn-muted italic">Message deleted</span>
        </template>
        <template v-else>
          <a v-if="isUrl(message.content)" :href="message.content" target="_blank" rel="noopener noreferrer" class="text-bn-accent underline break-all">{{ message.content }}</a>
          <span v-else>{{ message.content }}</span>
        </template>
      </div>
      <div v-if="!own && message.is_read" class="text-[10px] text-bn-muted font-mono mt-0.5 text-right">Read</div>
      <div v-if="canEdit && message.content !== '[deleted]'" class="mt-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" :class="own ? 'justify-start flex-row-reverse' : 'justify-end'">
        <button @click="$emit('edit', message)" class="text-[10px] text-bn-muted hover:text-bn-accent font-mono transition-colors">Edit</button>
        <button @click="$emit('delete', message)" class="text-[10px] text-bn-muted hover:text-bn-red font-mono transition-colors">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getInitials, formatShortTime } from '../../utils/helpers'

defineProps({
  message: { type: Object, required: true },
  own: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
})

defineEmits(['edit', 'delete'])

function isUrl(str) {
  try { return /^https?:\/\//i.test(str) } catch { return false }
}
</script>