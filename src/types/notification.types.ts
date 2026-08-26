export type NotificationType =
  | 'new_pre_order'
  | 'low_stock'
  | 'out_of_stock'
  | 'promotion_activated'
  | 'promotion_deactivated'
  | (string & {})

export interface NotificationData {
  title: string
  description: string
  targetRole?: string
  navigateTo?: string
  orderNumber?: string
  totalAmount?: number
  customerName?: string
  ingredientId?: number
  ingredientName?: string
  promotionId?: number
  promotionName?: string
  [key: string]: unknown
}

export interface NotificationItem {
  id: number
  shopId: number
  type: NotificationType
  notifiableType: string
  notifiableId: number
  data: NotificationData
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface UnreadCountResponse {
  count: number
}

export interface NotificationFilters {
  page?: number
  limit?: number
  read?: boolean
  type?: string
}
