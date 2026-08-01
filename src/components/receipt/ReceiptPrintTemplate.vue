<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { KHR_SYMBOL, USD_SYMBOL } from '@/constants/currency'

export interface ReceiptItemOption {
  groupName: string
  optionName: string
  extraPrice: number
}

export interface ReceiptItem {
  id: number | string
  productName: string
  quantity: number
  unitPrice: number
  options: ReceiptItemOption[]
  lineTotal: number // (unitPrice + sum(option extraPrice)) * quantity
}

const props = defineProps<{
  shopName: string
  footer?: string | null
  orderNumber: string
  createdAt: string | Date
  cashierName?: string | null
  items: ReceiptItem[]
  subtotal: number
  discountAmount?: number
  totalUsd: number
  totalKhr: number
  paymentCurrency: 'USD' | 'KHR'
  receivedAmount: number
  changeUsd: number
  changeKhr: number
}>()

const { t } = useI18n()

const formattedDateTime = computed(() => {
  const date = new Date(props.createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const formatUsd = (amount: number) => `${USD_SYMBOL}${amount.toFixed(2)}`
const formatKhr = (amount: number) => `${Math.round(amount).toLocaleString('en-US')}${KHR_SYMBOL}`

const hasDiscount = computed(() => (props.discountAmount ?? 0) > 0)
</script>

<template>
  <div class="receipt-print-root" aria-hidden="true">
    <div class="receipt-80mm">
      <div class="receipt-center receipt-bold receipt-shop-name">{{ shopName }}</div>

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>{{ t('receipt.orderNo') }}</span>
        <span class="receipt-bold">{{ orderNumber }}</span>
      </div>
      <div class="receipt-row">
        <span>{{ t('receipt.date') }}</span>
        <span>{{ formattedDateTime }}</span>
      </div>
      <div v-if="cashierName" class="receipt-row">
        <span>{{ t('receipt.cashier') }}</span>
        <span>{{ cashierName }}</span>
      </div>

      <div class="receipt-divider"></div>

      <div v-for="item in items" :key="item.id" class="receipt-item">
        <div class="receipt-row">
          <span class="receipt-item-name">{{ item.quantity }}x {{ item.productName }}</span>
          <span class="receipt-item-amount">{{ formatUsd(item.lineTotal) }}</span>
        </div>
        <div v-for="(opt, idx) in item.options" :key="idx" class="receipt-row receipt-modifier">
          <span>+ {{ opt.optionName }}</span>
          <span v-if="opt.extraPrice">{{ formatUsd(opt.extraPrice) }}</span>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>{{ t('receipt.subtotal') }}</span>
        <span>{{ formatUsd(subtotal) }}</span>
      </div>
      <div v-if="hasDiscount" class="receipt-row">
        <span>{{ t('receipt.discount') }}</span>
        <span>-{{ formatUsd(discountAmount ?? 0) }}</span>
      </div>

      <div class="receipt-divider receipt-divider-solid"></div>

      <div class="receipt-row receipt-bold receipt-total-line">
        <span>{{ t('receipt.total') }}</span>
        <span>{{ formatUsd(totalUsd) }}</span>
      </div>
      <div class="receipt-row receipt-bold">
        <span></span>
        <span>{{ formatKhr(totalKhr) }}</span>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>{{ t('receipt.paid') }} ({{ paymentCurrency }})</span>
        <span>{{
          paymentCurrency === 'USD' ? formatUsd(receivedAmount) : formatKhr(receivedAmount)
        }}</span>
      </div>
      <div class="receipt-row">
        <span>{{ t('receipt.change') }}</span>
        <span>{{ formatUsd(changeUsd) }} / {{ formatKhr(changeKhr) }}</span>
      </div>

      <div v-if="footer" class="receipt-divider"></div>
      <div v-if="footer" class="receipt-center receipt-footer-text">{{ footer }}</div>
    </div>
  </div>
</template>

<style scoped>
.receipt-80mm {
  width: 72mm;
  margin: 0 auto;
  padding: 3mm;
  background: #fff;
  color: #000;
  font-family: 'Courier New', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
}

.receipt-center {
  text-align: center;
}

.receipt-bold {
  font-weight: 700;
}

.receipt-shop-name {
  font-size: 14px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.receipt-item {
  margin-bottom: 2px;
}

.receipt-item-name {
  flex: 1;
  word-break: break-word;
}

.receipt-item-amount {
  white-space: nowrap;
}

.receipt-modifier {
  padding-left: 8px;
  font-size: 10px;
  color: #000;
}

.receipt-total-line {
  font-size: 13px;
}

.receipt-footer-text {
  margin-top: 4px;
  white-space: pre-line;
}

.receipt-divider {
  border-top: 1px dashed #000;
  margin: 4px 0;
}

.receipt-divider-solid {
  border-top: 1px solid #000;
}
</style>
