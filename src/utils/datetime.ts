// Shared date/time formatting so every screen renders timestamps identically
// (order rows, receipts, and the void audit line in both order-detail panels).
export const formatDateTime = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
