import http from './api'
import type {
  NotificationFilters,
  NotificationItem,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notification.types'

export const getNotifications = async (
  params?: NotificationFilters
): Promise<NotificationListResponse> => {
  const res = await http.get<NotificationListResponse>('/api/notifications', { params })
  return res.data
}

export const getUnreadNotificationCount = async (): Promise<UnreadCountResponse> => {
  const res = await http.get<UnreadCountResponse>('/api/notifications/unread-count')
  return res.data
}

export const markNotificationAsRead = async (id: number): Promise<NotificationItem> => {
  const res = await http.patch<NotificationItem>(`/api/notifications/${id}/read`)
  return res.data
}

export const markAllNotificationsAsRead = async (): Promise<{ count: number }> => {
  const res = await http.patch<{ count: number }>('/api/notifications/read-all')
  return res.data
}

export const deleteNotification = async (id: number): Promise<void> => {
  await http.delete(`/api/notifications/${id}`)
}

export const bulkDeleteNotifications = async (ids: number[]): Promise<{ deleted: number }> => {
  const res = await http.post<{ deleted: number }>('/api/notifications/bulk-delete', { ids })
  return res.data
}

export const clearAllNotifications = async (): Promise<{ deleted: number }> => {
  const res = await http.delete<{ deleted: number }>('/api/notifications/clear-all')
  return res.data
}
