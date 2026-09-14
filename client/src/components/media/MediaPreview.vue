<template>
  <div class="media-preview" :class="[`media-preview--${fileType}`, { 'media-preview--expanded': expanded }]">
    <!-- Image -->
    <img v-if="fileType === 'image'" :src="file.file_path" :alt="file.original_name"
      loading="lazy" class="media-preview__media" />

    <!-- Video -->
    <video v-else-if="fileType === 'video'" class="media-preview__media" preload="metadata"
      controls :poster="file.thumbnail_path || ''" playsinline>
      <source :src="file.file_path" :type="file.mime_type" />
      Your browser does not support video playback.
    </video>

    <!-- Audio -->
    <div v-else-if="fileType === 'audio'" class="audio-card">
      <div class="audio-card__visualizer">
        <span v-for="i in 20" :key="i" class="audio-card__bar" :style="{ height: (20 + Math.random() * 60) + '%' }"></span>
      </div>
      <div class="audio-card__controls">
        <button class="audio-card__play" :class="{ 'audio-card__play--playing': isPlaying }" :aria-label="isPlaying ? 'Pause playback' : 'Play audio'" @click="togglePlay">
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
        </button>
        <div class="audio-card__info">
          <span class="audio-card__name">{{ originalName }}</span>
          <input class="audio-card__range" type="range" min="0" :max="duration" :value="currentTime" @input="seek" aria-label="Seek audio" />
        </div>
        <span class="audio-card__time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>
    </div>

    <!-- Document -->
    <div v-else-if="fileType === 'document'" class="document-card">
      <div class="document-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="document-card__info">
        <div class="document-card__title">{{ originalName }}</div>
        <div class="document-card__meta">{{ fileType === 'document' && file.mime_type === 'application/pdf' ? 'PDF' : 'EPUB' }} · {{ fileSize }}</div>
      </div>
      <a class="btn btn--secondary btn--sm" :href="file.file_path" target="_blank" rel="noopener" @click.stop>
        Preview
      </a>
      <a class="btn btn--primary btn--sm" :href="file.file_path" download @click.stop aria-label="Download file">
        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    </div>

    <!-- Other -->
    <div v-else class="other-file">
      <div class="other-file__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <span class="other-file__name">{{ originalName }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getFileType, formatBytes } from '@/utils/format'

const props = defineProps({
  file: { type: Object, required: true },
  expanded: { type: Boolean, default: false }
})

const fileType = computed(() => getFileType(props.file))
const originalName = computed(() => props.file.original_name || props.file.filename || 'File')
const fileSize = computed(() => formatBytes(props.file.file_size))

// Audio player state
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let audioEl = null

function togglePlay() {
  if (!audioEl) {
    audioEl = new Audio(props.file.file_path)
    audioEl.addEventListener('timeupdate', () => {
      currentTime.value = audioEl.currentTime
      duration.value = audioEl.duration || 0
    })
    audioEl.addEventListener('ended', () => {
      isPlaying.value = false
      currentTime.value = 0
    })
  }
  
  if (isPlaying.value) {
    audioEl.pause()
    isPlaying.value = false
  } else {
    audioEl.play()
    isPlaying.value = true
  }
}

function seek(e) {
  if (audioEl) {
    audioEl.currentTime = e.target.value
    currentTime.value = e.target.value
  }
}

function formatTime(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

onUnmounted(() => {
  if (audioEl) {
    audioEl.pause()
    audioEl = null
  }
})
</script>

<style scoped lang="scss">
.media-preview {
  position: relative;
  width: 100%;
  background: var(--bg-secondary);
  
  &--expanded {
    .media-preview__media img {
      max-height: none;
    }
  }
  
  &--image img {
    max-height: 600px;
  }
  
  &__media {
    width: 100%;
    display: block;
  }
  
  &--video .media-preview__media {
    max-height: 600px;
    background: black;
  }
}

.audio-card {
  background: linear-gradient(160deg, rgba(0, 255, 136, 0.04), rgba(255, 45, 85, 0.04));
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  width: 100%;
  
  &__visualizer {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 60px;
    margin-bottom: 14px;
    padding: 0 4px;
  }
  
  &__bar {
    flex: 1;
    background: linear-gradient(180deg, var(--green-bright), rgba(0, 255, 136, 0.2));
    border-radius: 2px 2px 0 0;
    animation: equalize 2s ease-in-out infinite alternate;
    
    &:nth-child(2n) { animation-delay: 0.2s; }
    &:nth-child(3n) { animation-delay: 0.4s; }
    &:nth-child(4n) { animation-delay: 0.1s; }
  }
  
  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  &__play {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 16px rgba(255, 45, 85, 0.3);
    transition: all 0.2s ease;
    
    svg { width: 18px; height: 18px; }
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0 24px rgba(255, 45, 85, 0.5);
    }
    
    &--playing {
      animation: pulse-ring 2s infinite;
    }
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  
  &__name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &__range {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--border-light);
    border-radius: 2px;
    outline: none;
    
    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--green);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
    }
    
    &::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border: none;
      border-radius: 50%;
      background: var(--green);
      cursor: pointer;
    }
  }
  
  &__time {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

@keyframes equalize {
  from { height: 15% !important; }
  to { height: 80%; }
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.5); }
  70% { box-shadow: 0 0 0 10px rgba(255, 45, 85, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0); }
}

.document-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(160deg, rgba(0, 174, 255, 0.04), transparent);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  
  &__icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    background: rgba(255, 45, 85, 0.1);
    border-radius: 10px;
    
    svg { width: 28px; height: 28px; }
  }
  
  &__info {
    flex: 1;
    min-width: 0;
  }
  
  &__title {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &__meta {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }
  
  a { flex-shrink: 0; }
}

.other-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  
  &__icon {
    width: 32px;
    height: 32px;
    color: var(--text-secondary);
    
    svg { width: 100%; height: 100%; }
  }
  
  &__name {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>