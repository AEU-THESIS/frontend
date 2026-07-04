import http from './api'
import type { DailySummary } from '@/types/order.types'

/**
 * GET /api/reports/daily-summary?date=YYYY-MM-DD
 * Aggregate cards for a given calendar date. Defaults to today when omitted.
 */
export const getReportToday = async (date?: string): Promise<DailySummary> => {
  const res = await http.get('api/reports/daily-summary', {
    params: date ? { date } : {},
  })
  return res.data
}
