<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/store/useCartStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import type { PaymentCurrency, OrderResult } from '@/types/order.types'
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
const shopSettingsStore = useShopSettingsStore()

const paymentCurrency = ref<PaymentCurrency>('USD')

// Banks configured in Shop Settings (always at least one — defaults to ABA).
const banks = computed(() => shopSettingsStore.payment_banks)
const selectedBank = ref<string>('')

// Reset the form each time the modal opens: default currency to USD and pre-select the
// first configured bank (ABA by default).
watch(
  () => props.isOpen,
  isOpen => {
    if (isOpen) {
      paymentCurrency.value = 'USD'
      selectedBank.value = banks.value[0] ?? ''
    }
  }
)

// Total due, net of any promotion discount. A bank transfer is always the exact
// amount, so there is no numpad and no change to calculate.
const totalUSD = computed(() => cartStore.netTotal)
const totalKHR = computed(() => cartStore.netTotalInRiel)
const currentTotalDue = computed(() =>
  paymentCurrency.value === 'USD' ? totalUSD.value : totalKHR.value
)

const canSubmit = computed(() => !!selectedBank.value && !cartStore.isSubmitting)

const handleCheckoutSubmit = async () => {
  if (!selectedBank.value) {
    toast.error(t('cart.selectBankRequired'))
    return
  }

  try {
    // Exact amount: the customer paid the total via transfer, so received == due and
    // the server records no change. The server still recomputes the total/rate.
    const result = await cartStore.checkout(
      paymentCurrency.value,
      currentTotalDue.value,
      'khqr',
      selectedBank.value
    )
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

    <!-- Modal Container (single panel — no numpad) -->
    <div
      class="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-y-auto shadow-2xl flex flex-col max-h-[90vh] p-5 sm:p-6 md:p-8 animate-in slide-in-from-bottom-8 duration-300 select-none"
    >
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2.5">
          <span class="material-symbols-outlined text-2xl text-amber-700 dark:text-amber-500"
            >qr_code_scanner</span
          >
          <h2 class="text-xl font-headline font-bold text-stone-900 dark:text-stone-50">
            {{ t('cart.paymentDetails') }}
          </h2>
        </div>
        <Button
          type="button"
          variant="icon"
          class="h-9 w-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 p-0"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-lg">close</span>
        </Button>
      </div>

      <div class="space-y-6">
        <!-- DUAL CURRENCY DUE DISPLAY -->
        <div
          class="bg-stone-50/70 dark:bg-stone-950/30 p-5 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 space-y-4"
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
              <span class="text-3xl font-headline font-extrabold text-stone-900 dark:text-stone-50">
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

        <!-- PAYMENT CURRENCY CHIPS -->
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

        <!-- BANK SELECTOR -->
        <div class="space-y-2">
          <span
            class="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider"
            >{{ t('cart.selectBank') }}</span
          >
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button
              v-for="bank in banks"
              :key="bank"
              type="button"
              variant="tertiary"
              :class="[
                'py-3 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 border h-auto text-center hover:no-underline',
                selectedBank === bank
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-600/40 shadow-sm'
                  : 'bg-stone-50 dark:bg-stone-950/40 text-stone-600 dark:text-stone-300 border-stone-200/60 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700',
              ]"
              @click="selectedBank = bank"
            >
              <span
                v-if="selectedBank === bank"
                class="material-symbols-outlined text-base shrink-0"
                >check_circle</span
              >
              <span class="truncate">{{ bank }}</span>
            </Button>
          </div>
          <p class="text-[11px] text-stone-400 dark:text-stone-500 font-medium pt-1">
            {{ t('cart.khqrExactAmountNote') }}
          </p>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="flex gap-3 mt-8">
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
          :disabled="!canSubmit"
          class="flex-1 py-4 h-auto rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10 transition-all"
          @click="handleCheckoutSubmit"
        >
          <span v-if="cartStore.isSubmitting">{{ t('cart.processing') }}</span>
          <span v-else>{{ t('cart.completePayment') }}</span>
        </Button>
      </div>
    </div>
  </div>
</template>
