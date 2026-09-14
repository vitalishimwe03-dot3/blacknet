import { ref } from 'vue'
import api from '@/services/api'

export function useInfiniteScroll(loadFunction, options = {}) {
  const items = ref([])
  const page = ref(1)
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref(null)
  const observer = ref(null)
  const loadMoreRef = ref(null)
  
  const loadMore = async () => {
    if (loading.value || !hasMore.value) return
    loading.value = true
    error.value = null
    try {
      const result = await loadFunction(page.value)
      const newItems = result.items || result.posts || result
      items.value.push(...newItems)
      page.value++
      hasMore.value = page.value <= (result.pages || page.value)
    } catch (err) {
      error.value = err.message || 'Failed to load'
    } finally {
      loading.value = false
    }
  }
  
  const observe = (el) => {
    if (!el) return
    loadMoreRef.value = el
    if (observer.value) observer.value.disconnect()
    observer.value = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: options.rootMargin || '200px' })
    observer.value.observe(el)
  }
  
  const stop = () => {
    if (observer.value) observer.value.disconnect()
  }
  
  const reset = () => {
    items.value = []
    page.value = 1
    hasMore.value = true
  }
  
  return { items, loading, hasMore, error, loadMore, observe, stop, reset }
}