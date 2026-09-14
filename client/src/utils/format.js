export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function timeAgo(dateString) {
  const date = new Date(dateString.replace(' ', 'T') + (dateString.includes('Z') ? '' : 'Z'))
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export function formatDate(dateString) {
  const date = new Date(dateString.replace(' ', 'T') + (dateString.includes('Z') ? '' : 'Z'))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

export function formatDateTime(dateString) {
  const date = new Date(dateString.replace(' ', 'T') + (dateString.includes('Z') ? '' : 'Z'))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function extractHashtags(content) {
  if (!content) return []
  return content.match(/#([a-zA-Z0-9_]+)/g)?.map(h => h.slice(1)) || []
}

export function linkify(content) {
  if (!content) return ''
  return content.replace(/#(\w+)/g, (match) => `[${match}](/#/hashtag/$1)`)
}

export function getFileType(file) {
  const mime = file.mime_type || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf' || mime === 'application/epub+zip') return 'document'
  return 'other'
}

export function getInitials(name) {
  const parts = (name || '?').split(' ')
  const initial = parts[0]?.charAt(0)?.toUpperCase() || '?'
  const secondInitial = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : ''
  return initial + secondInitial
}

export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function validateFileType(file) {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
    'application/pdf', 'application/epub+zip'
  ]
  return allowed.includes(file.type)
}