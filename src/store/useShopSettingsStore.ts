import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ShopSettings } from '@/api/shop'

const DEFAULT_CURRENCY_SYMBOL = '$'
const DEFAULT_EXCHANGE_RATE = 4100
const DEFAULT_SHOP_NAME = 'Routine Cafe'
const KHR_SYMBOL = '\u17DB'
const LEGACY_KHR_CODE = 'KHR'
const storedExchangeRate = Number(localStorage.getItem('exchange_rate') || DEFAULT_EXCHANGE_RATE)

const normalizeCurrencySymbol = (symbol?: string | null) => {
  if (symbol === LEGACY_KHR_CODE) return KHR_SYMBOL
  return symbol || DEFAULT_CURRENCY_SYMBOL
}

export const useShopSettingsStore = defineStore('shopSettings', () => {
  const shop_name = ref(localStorage.getItem('shop_name') || DEFAULT_SHOP_NAME)
  const currency_symbol = ref(
    normalizeCurrencySymbol(localStorage.getItem('currency_symbol') || DEFAULT_CURRENCY_SYMBOL)
  )
  const exchange_rate = ref(
    Number.isFinite(storedExchangeRate) ? storedExchangeRate : DEFAULT_EXCHANGE_RATE
  )

  const currency_code = computed(() => (currency_symbol.value === KHR_SYMBOL ? 'KHR' : 'USD'))
  const exchangeRateLabel = computed(() => exchange_rate.value.toLocaleString('en-US'))

  const setShopSettings = (
    settings: Pick<ShopSettings, 'name' | 'currencySymbol' | 'exchangeRate'>
  ) => {
    const nextExchangeRate = Number(settings.exchangeRate)

    shop_name.value = settings.name || DEFAULT_SHOP_NAME
    currency_symbol.value = normalizeCurrencySymbol(settings.currencySymbol)
    exchange_rate.value = Number.isFinite(nextExchangeRate)
      ? nextExchangeRate
      : DEFAULT_EXCHANGE_RATE

    localStorage.setItem('shop_name', shop_name.value)
    localStorage.setItem('currency_symbol', currency_symbol.value)
    localStorage.setItem('exchange_rate', String(exchange_rate.value))
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
    setShopSettings,
    convertUsdToKhr,
    formatAmount,
    formatKhrAmount,
  }
})
