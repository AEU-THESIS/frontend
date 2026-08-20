import http from './api'

/** A blocked Telegram customer (Admin/Manager anti-spam). */
export interface BlockedCustomer {
  id: number
  telegramUserId: string
  telegramUsername: string | null
  blockedUntil: string | null // null = forever
  reason: string | null
  createdAt: string
}

export interface BlockCustomerPayload {
  telegramUserId: string
  telegramUsername?: string | null
  // ISO date-time string, or null/omitted = block forever.
  blockedUntil?: string | null
  reason?: string | null
}

export const blockCustomer = async (payload: BlockCustomerPayload): Promise<void> => {
  await http.post('/api/blocked-customers', payload)
}

export const getBlockedCustomers = async (): Promise<BlockedCustomer[]> => {
  const res = await http.get<BlockedCustomer[]>('/api/blocked-customers')
  return res.data
}

export const unblockCustomer = async (telegramUserId: string): Promise<void> => {
  await http.delete(`/api/blocked-customers/${encodeURIComponent(telegramUserId)}`)
}
