/**
 * Formats a date string into a relative time-ago string (e.g. "Just now", "2m ago", "1h ago", "3d ago").
 * If an i18n translation function `t` is passed, it uses localized strings.
 */
export function formatTimeAgo(
  dateInput: string | Date,
  t?: (key: string, params?: Record<string, unknown>) => string
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffInSeconds < 60) {
    return t ? t('notifications.time.justNow') : 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return t
      ? t('notifications.time.minutesAgo', { count: diffInMinutes })
      : `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return t ? t('notifications.time.hoursAgo', { count: diffInHours }) : `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return t ? t('notifications.time.daysAgo', { count: diffInDays }) : `${diffInDays}d ago`
}
