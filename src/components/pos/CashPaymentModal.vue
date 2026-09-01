<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/store/useCartStore'
import type { PaymentCurrency, OrderResult } from '@/types/order.types'
import { round2, roundRielDown } from '@/utils/money'
import { toast } from 'vue-sonner'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', result: OrderResult): void
}>()

const { t } = useI18n()
const cartStore = useCartStore()

const paymentCurrency = ref<PaymentCurrency>('USD')
const inputAmount = ref('') // raw input string from numpad

// Watch currency changes to clear raw input
watch(paymentCurrency, () => {
  inputAmount.value = ''
})

// Reset form data when the modal is opened or closed
watch(
  () => props.isOpen,
  () => {
    inputAmount.value = ''
    paymentCurrency.value = 'USD'
  }
)

// Total due in USD (net of any promotion discount)
const totalUSD = computed(() => cartStore.netTotal)

// Total due in KHR (net of any promotion discount)
const totalKHR = computed(() => cartStore.netTotalInRiel)

// Current total due depending on currency
const currentTotalDue = computed(() => {
  return paymentCurrency.value === 'USD' ? totalUSD.value : totalKHR.value
})

// Numeric parsing of input
const parsedInputAmount = computed(() => {
  const val = parseFloat(inputAmount.value)
  return isNaN(val) ? 0 : val
})

// Validation: enough payment received, and — for riel — tendered in whole 100៛
// notes (mirrors the server so change is always payable).
const isAmountSufficient = computed(() => {
  if (parsedInputAmount.value < currentTotalDue.value) return false
  if (paymentCurrency.value === 'KHR' && parsedInputAmount.value % 100 !== 0) return false
  return true
})

// Change in the payment currency, mirroring the server: riel change is rounded
// DOWN to the nearest 100៛ so only payable notes are handed back.
const changeInPaymentCurrency = computed(() => {
  if (!isAmountSufficient.value) return 0
  if (paymentCurrency.value === 'KHR') {
    return roundRielDown(parsedInputAmount.value - totalKHR.value)
  }
  return round2(parsedInputAmount.value - totalUSD.value)
})

// Both currency views of the change, derived from the payment-currency figure.
const changeUSD = computed(() =>
  paymentCurrency.value === 'KHR'
    ? round2(changeInPaymentCurrency.value / cartStore.exchangeRate)
    : changeInPaymentCurrency.value
)

const changeKHR = computed(() =>
  paymentCurrency.value === 'KHR'
    ? changeInPaymentCurrency.value
    : roundRielDown(changeInPaymentCurrency.value * cartStore.exchangeRate)
)

// Numpad input handlers
const handleNumClick = (val: string) => {
  if (val === '.') {
    if (paymentCurrency.value === 'KHR') return // KHR has no decimals
    if (inputAmount.value.includes('.')) return
  }
  inputAmount.value += val
}

const handleClear = () => {
  inputAmount.value = ''
}

const handleBackspace = () => {
  inputAmount.value = inputAmount.value.slice(0, -1)
}

const handleExactAmount = () => {
  inputAmount.value = currentTotalDue.value.toString()
}

const handleCheckoutSubmit = async () => {
  if (!isAmountSufficient.value) {
    toast.error(t('cart.insufficientPayment'))
    return
  }

  try {
    // The server recomputes the total, change and rate authoritatively and returns
    // them; the receipt is built from that result, not from the browser's figures.
    const result = await cartStore.checkout(paymentCurrency.value, parsedInputAmount.value)
    toast.success(t('cart.orderCreatedSuccess', { num: result.orderNumber }))
    emit('success', result)
  } catch {
    // Never surface raw validation/server text to the cashier.
    toast.error(t('cart.checkoutFailed'))
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
  >
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-stone-900/60 backdrop-blur-md transition-opacity duration-300"
      @click="emit('close')"
    ></div>

    <!-- Modal Container -->
    <div
      class="relative w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-y-auto md:overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 select-none"
    >
      <!-- LEFT HAND PANEL: Order Summary, Currency Selection & Change Calculations -->
      <div
        class="flex-1 p-5 sm:p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20"
      >
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-headline font-bold text-stone-900 dark:text-stone-50">
              {{ t('cart.paymentDetails') }}
            </h2>
            <Button
              type="button"
              variant="icon"
              class="md:hidden h-9 w-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 p-0"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined text-lg">close</span>
            </Button>
          </div>

          <!-- DUAL CURRENCY DUE DISPLAY -->
          <div
            class="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 space-y-4"
          >
            <div class="flex justify-between items-center">
              <span
                class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider"
                >{{ t('cart.amountDue') }}</span
              >
              <span
                class="text-[10px] bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold px-2 py-0.5 rounded-full select-none"
              >
                {{ t('payments.rate_usd_to_khr', { rate: cartStore.exchangeRate }) }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <span
                  class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1"
                  >USD</span
                >
                <span
                  class="text-3xl font-headline font-extrabold text-stone-900 dark:text-stone-50"
                >
                  ${{ totalUSD.toFixed(2) }}
                </span>
              </div>
              <div class="flex flex-col border-l border-stone-100 dark:border-stone-700 pl-4">
                <span
                  class="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1"
                  >KHR</span
                >
                <span
                  class="text-3xl font-headline font-extrabold text-amber-700 dark:text-amber-500"
                >
                  {{ totalKHR.toLocaleString() }}៛
                </span>
              </div>
            </div>
          </div>

          <!-- PAYMENT CURRENCY CHIPS SELECT -->
          <div class="space-y-2">
            <span
              class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider"
              >{{ t('cart.selectPaymentCurrency') }}</span
            >
            <div
              class="grid grid-cols-2 gap-1.5 bg-stone-100 dark:bg-stone-950 p-1 rounded-xl border border-stone-200/10"
            >
              <Button
                type="button"
                variant="tertiary"
                :class="[
                  'py-3 rounded-lg text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 border h-auto',
                  paymentCurrency === 'USD'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-200/50 dark:border-stone-700/50 shadow-sm'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300',
                ]"
                @click="paymentCurrency = 'USD'"
              >
                <span class="material-symbols-outlined text-lg text-amber-700 dark:text-amber-500"
                  >attach_money</span
                >
                {{ t('payments.usd_label') }}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                :class="[
                  'py-3 rounded-lg text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 border h-auto',
                  paymentCurrency === 'KHR'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-200/50 dark:border-stone-700/50 shadow-sm'
                    : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300',
                ]"
                @click="paymentCurrency = 'KHR'"
              >
                <span class="material-symbols-outlined text-lg text-amber-700 dark:text-amber-500"
                  >payments</span
                >
                {{ t('payments.khr_label') }}
              </Button>
            </div>
          </div>

          <!-- CHANGE DUE DISPLAY -->
          <div
            v-if="isAmountSufficient"
            class="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl space-y-3"
          >
            <span
              class="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase tracking-wider"
              >{{ t('cart.changeDue') }}</span
            >
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <span
                  class="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-0.5"
                  >USD</span
                >
                <span
                  class="text-2xl font-headline font-extrabold text-stone-800 dark:text-stone-50"
                >
                  ${{ changeUSD.toFixed(2) }}
                </span>
              </div>
              <div class="flex flex-col border-l border-amber-500/10 pl-4">
                <span
                  class="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-0.5"
                  >KHR</span
                >
                <span
                  class="text-2xl font-headline font-extrabold text-amber-700 dark:text-amber-500"
                >
                  {{ changeKHR.toLocaleString() }}៛
                </span>
              </div>
            </div>
          </div>
          <div
            v-else-if="parsedInputAmount > 0"
            class="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <span class="material-symbols-outlined text-lg">warning</span>
            <span class="text-xs font-semibold">{{ t('cart.insufficientReceived') }}</span>
          </div>
        </div>

        <div class="hidden md:flex gap-3 mt-6">
          <Button
            variant="secondary"
            type="button"
            class="flex-1 py-4 h-auto rounded-xl font-bold border border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border-stone-700 text-stone-800 dark:text-stone-50 hover:bg-stone-100 transition-all"
            @click="emit('close')"
          >
            {{ t('cart.cancel') }}
          </Button>
          <Button
            type="button"
            :disabled="!isAmountSufficient || cartStore.isSubmitting"
            class="flex-1 py-4 h-auto rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10 transition-all"
            @click="handleCheckoutSubmit"
          >
            <span v-if="cartStore.isSubmitting">{{ t('cart.processing') }}</span>
            <span v-else>{{ t('cart.completePayment') }}</span>
          </Button>
        </div>
      </div>

      <!-- RIGHT HAND PANEL: On-screen Numpad & Quick Cash Chips -->
      <div class="flex-1 p-5 sm:p-6 md:p-8 flex flex-col justify-between">
        <div class="space-y-4">
          <!-- Touch display showing raw input with Exact Amount Button inside -->
          <div
            class="relative bg-stone-100 dark:bg-stone-950 p-4 sm:p-5 rounded-2xl border border-stone-200/20 flex items-center justify-between min-h-[84px]"
          >
            <div class="flex flex-col items-start gap-2">
              <span
                class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider"
              >
                {{ t('cart.amountReceived') }}
              </span>
              <!-- Exact Amount Pill Button -->
              <Button
                type="button"
                variant="tertiary"
                class="px-3 py-1 rounded-lg border border-amber-600/35 hover:border-amber-600 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-extrabold text-[11px] transition-all flex items-center gap-1 active:scale-95 shadow-sm h-auto hover:no-underline"
                @click="handleExactAmount"
              >
                <span class="material-symbols-outlined text-[13px]">done_all</span>
                {{ t('cart.exactAmount') }}
              </Button>
            </div>
            <div class="flex items-baseline gap-1 select-all text-right">
              <span class="text-3xl font-headline font-extrabold text-stone-900 dark:text-stone-50">
                {{ inputAmount || '0' }}
              </span>
              <span class="text-sm font-bold text-stone-400 dark:text-stone-500">
                {{ paymentCurrency }}
              </span>
            </div>
          </div>

          <!-- On-screen Numpad -->
          <div class="grid grid-cols-3 gap-2">
            <Button
              v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
              :key="num"
              type="button"
              variant="icon"
              class="py-3 sm:py-4.5 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-950/40 dark:hover:bg-stone-800 text-xl font-extrabold text-stone-800 dark:text-stone-200 border border-stone-200/10 flex items-center justify-center transition-all active:scale-98 h-auto"
              @click="handleNumClick(num)"
            >
              {{ num }}
            </Button>
            <Button
              type="button"
              variant="icon"
              class="py-3 sm:py-4.5 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-950/40 dark:hover:bg-stone-800 text-xl font-extrabold text-stone-800 dark:text-stone-200 border border-stone-200/10 flex items-center justify-center transition-all active:scale-98 h-auto"
              @click="handleNumClick('.')"
            >
              .
            </Button>
            <Button
              type="button"
              variant="icon"
              class="py-3 sm:py-4.5 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-950/40 dark:hover:bg-stone-800 text-xl font-extrabold text-stone-800 dark:text-stone-200 border border-stone-200/10 flex items-center justify-center transition-all active:scale-98 h-auto"
              @click="handleNumClick('0')"
            >
              0
            </Button>
            <Button
              type="button"
              variant="icon"
              class="py-3 sm:py-4.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xl font-extrabold border border-red-500/10 flex items-center justify-center transition-all active:scale-98 h-auto"
              @click="handleBackspace"
            >
              <span class="material-symbols-outlined">backspace</span>
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            class="w-full py-3.5 sm:py-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-extrabold text-sm border border-stone-200/15 transition-all h-auto"
            @click="handleClear"
          >
            {{ t('cart.clear') }}
          </Button>
        </div>

        <!-- Mobile Complete Action -->
        <div class="md:hidden mt-6 flex gap-3">
          <Button
            variant="secondary"
            type="button"
            class="flex-1 py-4 h-auto rounded-xl font-bold border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
            @click="emit('close')"
          >
            {{ t('cart.cancel') }}
          </Button>
          <Button
            type="button"
            :disabled="!isAmountSufficient || cartStore.isSubmitting"
            class="flex-1 py-4 h-auto rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10 transition-all"
            @click="handleCheckoutSubmit"
          >
            <span v-if="cartStore.isSubmitting">{{ t('cart.processing') }}</span>
            <span v-else>{{ t('cart.completePayment') }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
