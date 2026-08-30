import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification as deleteNotificationApi,
  bulkDeleteNotifications as bulkDeleteNotificationsApi,
  clearAllNotifications as clearAllNotificationsApi,
} from '@/api/notification'
import type { NotificationItem } from '@/types/notification.types'
import { useAuthStore } from './useAuthStore'
import { ROLES } from '@/constants/roles'
import { playPreOrderSound, playNotificationSound } from '@/utils/audioAlert'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationItem[]>([])
  const unreadCount = ref<number>(0)
  const isLoading = ref<boolean>(false)
  const isLoadingMore = ref<boolean>(false)
  const isDropdownOpen = ref<boolean>(false)
  const currentPage = ref<number>(1)
  const totalPages = ref<number>(1)
  const totalCount = ref<number>(0)
  const hasFetchedList = ref<boolean>(false)
  const lastStockAlertAt = ref<number>(0)

  const normalizeNotification = (n: NotificationItem): NotificationItem => ({
    ...n,
    data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data || {},
  })

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationCount()
      unreadCount.value = res.count
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error)
    }
  }

  const fetchNotifications = async (page = 1, isLoadMore = false) => {
    if (isLoadMore) {
      isLoadingMore.value = true
    } else {
      isLoading.value = true
    }

    try {
      const res = await getNotifications({ page, limit: 20 })
      const normalizedItems = res.notifications.map(normalizeNotification)

      if (page === 1) {
        notifications.value = normalizedItems
      } else {
        const existingIds = new Set(notifications.value.map(n => n.id))
        const newItems = normalizedItems.filter(n => !existingIds.has(n.id))
        notifications.value.push(...newItems)
      }

      currentPage.value = res.pagination.page
      totalPages.value = res.pagination.totalPages
      totalCount.value = res.pagination.total
      hasFetchedList.value = true
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  const loadMore = async () => {
    if (isLoadingMore.value || currentPage.value >= totalPages.value) return
    await fetchNotifications(currentPage.value + 1, true)
  }

  const markAsRead = async (id: number) => {
    const item = notifications.value.find(n => n.id === id)
    if (!item || item.readAt) return

    // Optimistic UI update
    item.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)

    try {
      await markNotificationAsRead(id)
    } catch (error) {
      console.error(`Failed to mark notification #${id} as read:`, error)
      item.readAt = null
      unreadCount.value++
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount.value === 0) return

    const previousUnread = unreadCount.value
    const previousNotifications = notifications.value.map(n => ({ ...n }))

    notifications.value.forEach(n => {
      if (!n.readAt) {
        n.readAt = new Date().toISOString()
      }
    })
    unreadCount.value = 0

    try {
      await markAllNotificationsAsRead()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      notifications.value = previousNotifications
      unreadCount.value = previousUnread
    }
  }

  const deleteNotification = async (id: number) => {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      const item = notifications.value[idx]
      if (!item.readAt) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      notifications.value.splice(idx, 1)
      totalCount.value = Math.max(0, totalCount.value - 1)
    }

    try {
      await deleteNotificationApi(id)
    } catch (error) {
      console.error(`Failed to delete notification #${id}:`, error)
      await Promise.all([fetchNotifications(1), fetchUnreadCount()])
    }
  }

  const deleteSelected = async (ids: number[]) => {
    const idSet = new Set(ids)
    let unreadRemoved = 0

    notifications.value = notifications.value.filter(n => {
      if (idSet.has(n.id)) {
        if (!n.readAt) unreadRemoved++
        return false
      }
      return true
    })

    unreadCount.value = Math.max(0, unreadCount.value - unreadRemoved)
    totalCount.value = Math.max(0, totalCount.value - ids.length)

    try {
      await bulkDeleteNotificationsApi(ids)
    } catch (error) {
      console.error('Failed to bulk delete notifications:', error)
      await Promise.all([fetchNotifications(1), fetchUnreadCount()])
    }
  }

  const clearAll = async () => {
    notifications.value = []
    unreadCount.value = 0
    totalCount.value = 0

    try {
      await clearAllNotificationsApi()
    } catch (error) {
      console.error('Failed to clear all notifications:', error)
      await Promise.all([fetchNotifications(1), fetchUnreadCount()])
    }
  }

  const handleSseNotification = (rawNotification: NotificationItem) => {
    const newNotification = normalizeNotification(rawNotification)
    const authStore = useAuthStore()
    const userRole = authStore.user?.role

    // Admins and Managers see all notifications. For Cashier, filter by targetRole if set
    if (newNotification.data?.targetRole) {
      const target = String(newNotification.data.targetRole)
      if (userRole !== ROLES.ADMIN && userRole !== ROLES.MANAGER && userRole !== target) {
        return
      }
    }

    const alreadyExists = notifications.value.some(n => n.id === newNotification.id)
    if (alreadyExists) return

    unreadCount.value++
    totalCount.value++

    notifications.value.unshift(newNotification)

    // Trigger stock alert signal for reactive view syncing
    if (newNotification.type === 'low_stock' || newNotification.type === 'out_of_stock') {
      lastStockAlertAt.value = Date.now()
    }

    // Play audible chime alert for staff
    if (newNotification.type === 'new_pre_order' || newNotification.type === 'pre_order') {
      playPreOrderSound()
    } else {
      playNotificationSound()
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    isDropdownOpen,
    currentPage,
    totalPages,
    totalCount,
    hasFetchedList,
    lastStockAlertAt,
    fetchUnreadCount,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteSelected,
    clearAll,
    handleSseNotification,
  }
})
