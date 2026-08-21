import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { USD_SYMBOL, KHR_SYMBOL, LEGACY_KHR_CODE } from '@/constants/currency'
import type { ShopSettings } from '@/types/shop'

const DEFAULT_EXCHANGE_RATE = 4100
const DEFAULT_SHOP_NAME = 'Routine Cafe'

const getStoredValue = (key: string) => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

const setStoredValue = (key: string, value: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, value)
}

const normalizeCurrencySymbol = (symbol?: string | null) => {
  if (symbol === LEGACY_KHR_CODE) return KHR_SYMBOL
  return symbol || USD_SYMBOL
}

const normalizeExchangeRate = (exchangeRate: ShopSettings['exchangeRate']) => {
  const nextExchangeRate = Number(exchangeRate)
  return Number.isFinite(nextExchangeRate) ? nextExchangeRate : DEFAULT_EXCHANGE_RATE
}

export const useShopSettingsStore = defineStore('shopSettings', () => {
  const initialExchangeRate = Number(getStoredValue('exchange_rate') || DEFAULT_EXCHANGE_RATE)
  const shop_name = ref(getStoredValue('shop_name') || DEFAULT_SHOP_NAME)
  const currency_symbol = ref(normalizeCurrencySymbol(getStoredValue('currency_symbol')))
  const exchange_rate = ref(
    Number.isFinite(initialExchangeRate) ? initialExchangeRate : DEFAULT_EXCHANGE_RATE
  )
  const is_order_management_enabled = ref(getStoredValue('is_order_management_enabled') === 'true')
  const is_shop_closed = ref(getStoredValue('is_shop_closed') === 'true')

  const currency_code = computed(() => (currency_symbol.value === KHR_SYMBOL ? 'KHR' : 'USD'))
  const exchangeRateLabel = computed(() => exchange_rate.value.toLocaleString('en-US'))

  const setShopSettings = (
    settings: Pick<
      ShopSettings,
      'name' | 'currencySymbol' | 'exchangeRate' | 'isOrderManagementEnabled' | 'isShopClosed'
    >
  ) => {
    shop_name.value = settings.name || DEFAULT_SHOP_NAME
    currency_symbol.value = normalizeCurrencySymbol(settings.currencySymbol)
    exchange_rate.value = normalizeExchangeRate(settings.exchangeRate)
    is_order_management_enabled.value = settings.isOrderManagementEnabled === true
    is_shop_closed.value = settings.isShopClosed === true

    setStoredValue('shop_name', shop_name.value)
    setStoredValue('currency_symbol', currency_symbol.value)
    setStoredValue('exchange_rate', String(exchange_rate.value))
    setStoredValue('is_order_management_enabled', String(is_order_management_enabled.value))
    setStoredValue('is_shop_closed', String(is_shop_closed.value))
  }

  const convertUsdToKhr = (amount: number) => Math.round(amount * exchange_rate.value)

  const formatAmount = (amount: number) => {
    if (currency_code.value === 'KHR') {
      return `${currency_symbol.value}${convertUsdToKhr(amount).toLocaleString('en-US')}`
    }

    return `${currency_symbol.value}${amount.toFixed(2)}`
  }

  const formatKhrAmount = (amount: number) => `${convertUsdToKhr(amount).toLocaleString('en-US')}`

  return {
    shop_name,
    currency_symbol,
    currency_code,
    exchange_rate,
    exchangeRateLabel,
    is_order_management_enabled,
    is_shop_closed,
    setShopSettings,
    convertUsdToKhr,
    formatAmount,
    formatKhrAmount,
  }
})
