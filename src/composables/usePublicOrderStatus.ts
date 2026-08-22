import { useI18n } from 'vue-i18n'

export interface OrderStatusConfig {
  title: string
  badgeClass: string
  dotClass: string
  step: number
}

export function usePublicOrderStatus() {
  const { t } = useI18n()

  const statusConfig = (status: string): OrderStatusConfig => {
    switch (status) {
      case 'pending':
        return {
          title: t('publicOrder.status.pending'),
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
          dotClass: 'bg-amber-500',
          step: 1,
        }
      case 'preparing':
        return {
          title: t('publicOrder.status.preparing'),
          badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
          dotClass: 'bg-blue-500',
          step: 2,
        }
      case 'ready':
        return {
          title: t('publicOrder.status.ready'),
          badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          dotClass: 'bg-emerald-500',
          step: 3,
        }
      case 'completed':
        return {
          title: t('publicOrder.status.completed'),
          badgeClass: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
          dotClass: 'bg-stone-400',
          step: 4,
        }
      case 'rejected':
      case 'canceled':
        return {
          title: t('publicOrder.status.canceled'),
          badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
          dotClass: 'bg-red-500',
          step: 0,
        }
      default:
        return {
          title: t('publicOrder.status.pending'),
          badgeClass: 'bg-stone-100 text-stone-600',
          dotClass: 'bg-stone-400',
          step: 1,
        }
    }
  }

  return { statusConfig }
}
