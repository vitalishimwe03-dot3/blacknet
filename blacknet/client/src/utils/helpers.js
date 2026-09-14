import { formatDistanceToNow, format } from 'date-fns'

export function timeAgo(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function formatShortTime(date) {
  if (!date) return ''
  return format(new Date(date), 'HH:mm')
}

export function truncate(str, len = 100) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

export function getStatusColor(isOnline) {
  return isOnline ? 'bg-bn-green' : 'bg-bn-muted/40'
}

export function getRoleBadge(role) {
  const map = {
    admin: { class: 'badge-red', label: 'Admin' },
    moderator: { class: 'badge-yellow', label: 'Mod' },
    user: { class: 'badge-accent', label: 'User' },
  }
  return map[role] || map.user
}
