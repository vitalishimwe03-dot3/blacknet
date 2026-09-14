<template>
  <div class="post-content">
    <span v-for="(word, i) in parsedWords" :key="i" class="post-content__word"
      :class="{ 'post-content__hashtag': word.startsWith('#') }">
      <router-link v-if="word.startsWith('#')" :to="`/hashtag/${word.slice(1).toLowerCase()}`">{{ word }}</router-link>
      <template v-else>{{ word }}</template>
      <template v-if="i < parsedWords.length - 1"> </template>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  hashtags: { type: Array, default: () => [] }
})

const parsedWords = computed(() => {
  return props.content.split(/(\s+)/)
})
</script>

<style scoped lang="scss">
.post-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
  white-space: pre-wrap;
  
  &__hashtag a {
    color: var(--accent);
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
      text-shadow: 0 0 8px rgba(255, 45, 85, 0.4);
    }
  }
}
</style>