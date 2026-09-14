import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import { useNotificationStore } from '@/stores/notifications'

export function usePosts() {
  const toastStore = useToastStore()
  const notificationStore = useNotificationStore()

  const toggleLike = async (post) => {
    try {
      const { data } = await api.post(`/posts/${post.id}/like`)
      post.is_liked = data.liked
      post.likes_count = data.likes_count
      return data
    } catch (err) {
      toastStore.error(err.message || 'Failed to like')
    }
  }

  const toggleBookmark = async (post) => {
    try {
      const { data } = await api.post(`/bookmarks/${post.id}`)
      post.is_bookmarked = data.bookmarked
      if (data.bookmarked) notificationStore.increment('bookmark')
      return data
    } catch (err) {
      toastStore.error(err.message || 'Failed to bookmark')
    }
  }

  const sharePost = async (post) => {
    try {
      const { data } = await api.post(`/posts/${post.id}/share`)
      post.shares_count = data.shares_count
      toastStore.success('Post shared')
      return data
    } catch (err) {
      toastStore.error(err.message || 'Failed to share')
    }
  }

  const deletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`)
      toastStore.success('Post deleted')
      return true
    } catch (err) {
      toastStore.error(err.message || 'Failed to delete')
      return false
    }
  }

  const reportPost = async (postId, reason, description) => {
    try {
      await api.post(`/posts/${postId}/report`, { reason, description })
      toastStore.success('Report submitted')
      return true
    } catch (err) {
      toastStore.error(err.message || 'Failed to report')
      return false
    }
  }

  const followUser = async (username) => {
    try {
      const { data } = await api.post(`/follows/${username}`)
      return data
    } catch (err) {
      toastStore.error(err.message || 'Failed to follow')
    }
  }

  return { toggleLike, toggleBookmark, sharePost, deletePost, reportPost, followUser }
}