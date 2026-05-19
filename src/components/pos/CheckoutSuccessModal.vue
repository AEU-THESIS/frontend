<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  isOpen: boolean
  orderResult: {
    orderId: number
    orderNumber: string
    totalAmount: number
    receivedAmount: number
    paymentCurrency: string
    changeUSD: number
    changeKHR: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const handlePrintReceipt = () => {
  console.log('Print receipt requested for order:', props.orderResult?.orderNumber)
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
      <div class="success-checkmark-wrapper mb-6">
        <div class="success-checkmark-circle">
          <svg class="success-checkmark-svg" viewBox="0 0 52 52">
            <circle class="success-checkmark-circle-bg" cx="26" cy="26" r="25" fill="none" />
            <path class="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <!-- Confetti/Burst particles -->
        <div class="sparkle sparkle-1"></div>
        <div class="sparkle sparkle-2"></div>
        <div class="sparkle sparkle-3"></div>
        <div class="sparkle sparkle-4"></div>
        <div class="sparkle sparkle-5"></div>
        <div class="sparkle sparkle-6"></div>
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
        <div class="h-px bg-stone-200/50 dark:bg-stone-800/50 w-full"></div>

        <div class="flex justify-between items-center">
          <span
            class="text-xs text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider"
            >{{ t('cart.totalAmount') }}</span
          >
          <span class="font-headline font-extrabold text-stone-900 dark:text-stone-100"
            >${{ Number(orderResult.totalAmount).toFixed(2) }}</span
          >
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

<style scoped>
.success-checkmark-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-checkmark-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.02) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 0 0 rgba(16, 185, 129, 0),
    inset 0 0 20px rgba(16, 185, 129, 0.05);
  animation: pulse-glow 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.success-checkmark-svg {
  width: 52px;
  height: 52px;
  display: block;
}

.success-checkmark-circle-bg {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 3;
  stroke-miterlimit: 10;
  stroke: #10b981; /* emerald-500 */
  fill: none;
  animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.success-checkmark-check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke: #10b981; /* emerald-500 */
  animation:
    stroke-check 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.55s forwards,
    scale-check 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.85s forwards;
}

/* Confetti Sparkles Burst Animation */
.sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #34d399; /* emerald-400 */
  opacity: 0;
  transform: scale(0);
}

.sparkle-1 {
  top: 10%;
  left: 50%;
  animation: burst-1 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.sparkle-2 {
  top: 30%;
  right: 10%;
  animation: burst-2 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.sparkle-3 {
  bottom: 20%;
  right: 15%;
  animation: burst-3 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.sparkle-4 {
  bottom: 10%;
  left: 50%;
  animation: burst-4 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.sparkle-5 {
  bottom: 20%;
  left: 15%;
  animation: burst-5 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.sparkle-6 {
  top: 30%;
  left: 10%;
  animation: burst-6 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}

@keyframes stroke-circle {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes stroke-check {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes scale-check {
  0%,
  100% {
    transform: none;
  }
  50% {
    transform: scale(1.18);
  }
}

@keyframes pulse-glow {
  0% {
    box-shadow:
      0 0 0 0 rgba(16, 185, 129, 0.4),
      inset 0 0 20px rgba(16, 185, 129, 0.05);
  }
  70% {
    box-shadow:
      0 0 0 20px rgba(16, 185, 129, 0),
      inset 0 0 20px rgba(16, 185, 129, 0.12);
  }
  100% {
    box-shadow:
      0 0 0 0 rgba(16, 185, 129, 0),
      inset 0 0 20px rgba(16, 185, 129, 0.05);
  }
}

/* Burst directions */
@keyframes burst-1 {
  0% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-32px) scale(1);
    opacity: 0;
  }
}
@keyframes burst-2 {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(28px, -16px) scale(1);
    opacity: 0;
  }
}
@keyframes burst-3 {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(28px, 16px) scale(1);
    opacity: 0;
  }
}
@keyframes burst-4 {
  0% {
    transform: translateY(0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(32px) scale(1);
    opacity: 0;
  }
}
@keyframes burst-5 {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(-28px, 16px) scale(1);
    opacity: 0;
  }
}
@keyframes burst-6 {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(-28px, -16px) scale(1);
    opacity: 0;
  }
}
</style>
