<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roundRielUp } from '@/utils/money'
import type { CheckoutSuccessData } from '@/types/order.types'

const props = defineProps<{
  isOpen: boolean
  orderResult: CheckoutSuccessData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

// Total shown in the payment currency. For a riel order this is the note-rounded
// riel due (using the order's own snapshot rate), so the receipt matches Order
// History exactly.
const totalDisplay = computed(() => {
  if (!props.orderResult) return ''
  const { totalAmount, paymentCurrency, exchangeRateSnapshot } = props.orderResult
  if (paymentCurrency === 'KHR') {
    return `${roundRielUp(totalAmount * exchangeRateSnapshot).toLocaleString()}៛`
  }
  return `$${totalAmount.toFixed(2)}`
})

// Cashier printed on the receipt. Falls back to the translated "System" label so the
// line is never blank (matches how an order with no recorded user is shown elsewhere).
const servedByDisplay = computed(
  () => props.orderResult?.servedBy?.trim() || t('common.systemCashier')
)

const receiptRef = ref<HTMLElement | null>(null)

const handlePrintReceipt = () => {
  if (!receiptRef.value) return

  // Create an iframe for printing to avoid popup blockers and keep it elegant
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return

  // Copy style tags and link stylesheets
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
  const headHTML = styles.map(style => style.outerHTML).join('\n')

  // Build printing document mimicking the premium thermal receipt style
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${props.orderResult?.orderNumber || ''}</title>
        ${headHTML}
        <style>
          @media print {
            body {
              margin: 0;
              padding: 20px;
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: ui-sans-serif, system-ui, sans-serif;
            background-color: white;
            padding: 20px;
          }
          .bg-stone-50 {
            background-color: #fafaf9 !important;
          }
          .border {
            border: 1px solid #e7e5e4 !important;
          }
        </style>
      </head>
      <body>
        <div class="w-full max-w-sm mx-auto">
          <div class="text-center mb-6">
            <h1 class="text-xl font-bold uppercase tracking-wide">Routine Café & Bakery</h1>
            <p class="text-xs text-stone-500">Receipt / Invoice</p>
          </div>
          ${receiptRef.value.outerHTML}
        </div>
      </body>
    </html>
  `)
  doc.close()

  // Wait for resources and styling to fully render, then execute browser print flow
  setTimeout(() => {
    if (iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      // Safely remove the iframe after standard print dialog interaction
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }
  }, 500)
}
</script>

<template>
  <div
    v-if="isOpen && orderResult"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
  >
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity duration-300"
      @click="emit('close')"
    ></div>

    <!-- Modal Container -->
    <div
      class="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-8 items-center text-center animate-in scale-in duration-300 select-none"
    >
      <!-- Premium Success Checkmark Animation -->
      <div class="relative w-[88px] h-[88px] flex items-center justify-center mb-6">
        <div
          class="w-[80px] h-[80px] rounded-full flex items-center justify-center bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,rgba(16,185,129,0.02)_100%)] shadow-[0_0_0_0_rgba(16,185,129,0),inset_0_0_20px_rgba(16,185,129,0.05)] animate-pulse-glow"
        >
          <svg class="w-[52px] h-[52px] block" viewBox="0 0 52 52">
            <circle
              class="stroke-3 [stroke-dasharray:166] [stroke-dashoffset:166] [stroke-miterlimit:10] stroke-emerald-500 fill-none animate-stroke-circle"
              cx="26"
              cy="26"
              r="25"
              fill="none"
            />
            <path
              class="origin-center [stroke-dasharray:48] [stroke-dashoffset:48] stroke-[4.5] [stroke-linecap:round] stroke-emerald-500 animate-success-check"
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
            />
          </svg>
        </div>
        <!-- Confetti/Burst particles -->
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 top-[10%] left-[50%] animate-burst-1"
        ></div>
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 top-[30%] right-[10%] animate-burst-2"
        ></div>
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 bottom-[20%] right-[15%] animate-burst-3"
        ></div>
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 bottom-[10%] left-[50%] animate-burst-4"
        ></div>
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 bottom-[20%] left-[15%] animate-burst-5"
        ></div>
        <div
          class="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 scale-0 top-[30%] left-[10%] animate-burst-6"
        ></div>
      </div>

      <!-- Header -->
      <h2 class="text-2xl font-headline font-bold text-stone-900 dark:text-stone-50 mb-2">
        {{ t('cart.paymentSuccessful') }}
      </h2>
      <p class="text-sm text-stone-500 dark:text-stone-400 font-medium mb-6">
        {{ t('cart.orderPlacedDesc') }}
      </p>

      <!-- Receipt Card Info -->
      <div
        ref="receiptRef"
        class="w-full bg-stone-50 dark:bg-stone-950 p-6 rounded-2xl border border-stone-200/50 dark:border-stone-800/50 space-y-4 mb-8 text-left"
      >
        <div class="flex justify-between items-center text-xs">
          <span class="text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">{{
            t('cart.orderNumber')
          }}</span>
          <span class="text-stone-800 dark:text-stone-200 font-extrabold">{{
            orderResult.orderNumber
          }}</span>
        </div>

        <div class="flex justify-between items-center text-xs">
          <span class="text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">{{
            t('cart.servedBy')
          }}</span>
          <span class="text-stone-800 dark:text-stone-200 font-extrabold">{{
            servedByDisplay
          }}</span>
        </div>
        <div class="h-px bg-stone-200/50 dark:bg-stone-800/50 w-full"></div>

        <div class="flex justify-between items-center">
          <span
            class="text-xs text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider"
            >{{ t('cart.totalAmount') }}</span
          >
          <span class="font-headline font-extrabold text-stone-900 dark:text-stone-100">{{
            totalDisplay
          }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span
            class="text-xs text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider"
            >{{ t('cart.amountReceived') }}</span
          >
          <span class="font-headline font-extrabold text-stone-900 dark:text-stone-100">
            {{ orderResult.paymentCurrency === 'USD' ? '$' : ''
            }}{{ Number(orderResult.receivedAmount).toLocaleString()
            }}{{ orderResult.paymentCurrency === 'KHR' ? '៛' : '' }}
          </span>
        </div>
        <div class="h-px bg-stone-200/50 dark:bg-stone-800/50 w-full"></div>

        <!-- Calculated Changes -->
        <div class="space-y-1">
          <span
            class="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider"
            >{{ t('cart.changeReturned') }}</span
          >
          <div class="grid grid-cols-2 gap-4 pt-1">
            <div class="flex flex-col">
              <span
                class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-0.5"
                >USD</span
              >
              <span class="text-xl font-headline font-extrabold text-stone-800 dark:text-stone-100">
                ${{ orderResult.changeUSD.toFixed(2) }}
              </span>
            </div>
            <div class="flex flex-col border-l border-stone-200/60 dark:border-stone-800 pl-4">
              <span
                class="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-0.5"
                >KHR</span
              >
              <span class="text-xl font-headline font-extrabold text-amber-700 dark:text-amber-500">
                {{ orderResult.changeKHR.toLocaleString() }}៛
              </span>
            </div>
          </div>
        </div>

        <!-- Free items note — lists any loyalty-stamp redemptions on this order so the
             customer sees the free drink was accounted for. -->
        <template v-if="orderResult.freeItems && orderResult.freeItems.length > 0">
          <div class="h-px bg-stone-200/50 dark:bg-stone-800/50 w-full"></div>
          <div class="space-y-1.5">
            <span
              class="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider"
              >{{ t('cart.freeItemsReceipt') }}</span
            >
            <div
              v-for="(free, idx) in orderResult.freeItems"
              :key="idx"
              class="flex justify-between items-center text-xs font-semibold text-stone-600 dark:text-stone-300"
            >
              <span class="truncate pr-2">
                {{ free.name }}<span v-if="free.quantity > 1"> × {{ free.quantity }}</span>
              </span>
              <span
                class="shrink-0 font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-500"
              >
                {{ t('cart.freeLoyaltyStamp') }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 w-full">
        <Button
          type="button"
          variant="tertiary"
          class="flex-1 py-4 h-auto rounded-xl font-bold border border-stone-200 dark:border-stone-750 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-850 hover:no-underline flex items-center justify-center gap-2 transition-all active:scale-98"
          @click="handlePrintReceipt"
        >
          <span class="material-symbols-outlined text-lg">print</span>
          {{ t('cart.printReceipt') }}
        </Button>
        <Button
          type="button"
          class="flex-1 bg-stone-800 hover:bg-stone-700 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 py-4 h-auto rounded-xl font-bold shadow-lg transition-all active:scale-98"
          @click="emit('close')"
        >
          {{ t('cart.newOrder') }}
        </Button>
      </div>
    </div>
  </div>
</template>
