<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/store/useCartStore'

import type { CartItemOption } from '@/types/order.types'

const { t } = useI18n()
const cartStore = useCartStore()

const formatOptions = (options: CartItemOption[]) => {
  return options.map(o => o.optionName).join(', ')
}

const handlePayCash = () => {
  if (cartStore.items.length === 0) return
  cartStore.isCashModalOpen = true
}
</script>

<template>
  <aside
    class="w-full md:w-[35%] flex flex-col bg-stone-100 dark:bg-stone-950 border-t md:border-t-0 md:border-l border-stone-200 dark:border-stone-850 h-full select-none"
  >
    <!-- Sidebar Header -->
    <div class="p-6 pb-4">
      <div class="flex items-center justify-between min-h-[40px] mb-4">
        <span
          class="text-lg font-headline font-bold text-stone-800 dark:text-stone-50 select-none leading-none"
        >
          {{ t('cart.currentOrder') }}
        </span>
        <Button
          v-if="cartStore.items.length > 0"
          type="button"
          variant="tertiary"
          class="text-[10px] font-extrabold text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-all uppercase tracking-wider select-none active:scale-95 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-xl border border-red-200/10 shadow-sm hover:shadow h-auto"
          @click="cartStore.clearCart()"
        >
          <span class="material-symbols-outlined text-[14px]">delete_sweep</span>
          {{ t('cart.clearAll') }}
        </Button>
      </div>
      <div class="h-px bg-stone-200/60 dark:bg-stone-800/60 w-full"></div>
    </div>

    <!-- Cart Items Scroll Area -->
    <div class="flex-1 overflow-y-auto px-6 space-y-3.5 scrollbar-hide">
      <div
        v-if="cartStore.items.length === 0"
        class="h-64 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-2"
      >
        <span class="material-symbols-outlined text-5xl">shopping_cart_off</span>
        <span class="text-sm font-bold">{{ t('cart.empty') }}</span>
      </div>

      <!-- Item Row -->
      <div
        v-for="item in cartStore.items"
        :key="item.cartId"
        class="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800/80 p-4 rounded-2xl flex items-center gap-4 group transition-all"
      >
        <!-- Product Image or Fallback -->
        <div
          class="w-12 h-12 rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-950 shrink-0 flex items-center justify-center text-stone-300 dark:text-stone-700"
        >
          <img
            v-if="item.imageUrl"
            class="w-full h-full object-cover"
            :alt="item.productName"
            :src="item.imageUrl"
          />
          <span v-else class="material-symbols-outlined text-2xl">local_cafe</span>
        </div>

        <!-- Info -->
        <div class="grow min-w-0">
          <h4 class="font-extrabold text-stone-800 dark:text-stone-50 text-sm truncate">
            {{ item.productName }}
          </h4>
          <p
            v-if="item.selectedOptions.length > 0"
            class="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wide truncate mt-0.5"
          >
            {{ formatOptions(item.selectedOptions) }}
          </p>
        </div>

        <!-- Quantity Adjuster -->
        <div
          class="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-950 rounded-xl p-1 shrink-0 border border-stone-200/10"
        >
          <Button
            type="button"
            variant="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50 flex items-center justify-center active:scale-90 p-0"
            @click="cartStore.updateQuantity(item.cartId, item.quantity - 1)"
          >
            <span class="material-symbols-outlined text-[13px] font-bold">remove</span>
          </Button>
          <span
            class="font-extrabold text-stone-900 dark:text-stone-50 px-1 text-sm min-w-4 text-center"
          >
            {{ item.quantity }}
          </span>
          <Button
            type="button"
            variant="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50 flex items-center justify-center active:scale-90 p-0"
            @click="cartStore.updateQuantity(item.cartId, item.quantity + 1)"
          >
            <span class="material-symbols-outlined text-[13px] font-bold">add</span>
          </Button>
        </div>

        <!-- Price -->
        <div
          class="w-16 text-right font-headline font-extrabold text-stone-800 dark:text-stone-50 text-sm shrink-0"
        >
          ${{ item.itemTotal.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Cart Summary & Actions -->
    <div
      class="p-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-850 mt-auto flex flex-col gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10"
    >
      <div
        class="flex justify-between items-center text-sm font-bold text-stone-400 dark:text-stone-500"
      >
        <span>{{ t('cart.subtotal') }}</span>
        <span>${{ cartStore.cartTotal.toFixed(2) }}</span>
      </div>

      <div class="h-px bg-stone-200/60 dark:bg-stone-800/60 w-full my-1"></div>

      <div class="flex justify-between items-end mb-2">
        <div class="flex flex-col">
          <span
            class="text-[10px] font-bold text-stone-400 dark:text-stone-500 tracking-wider uppercase mb-1"
          >
            {{ t('cart.totalAmount') }}
          </span>
          <span
            class="text-4xl font-headline font-extrabold text-stone-900 dark:text-stone-50 leading-none tracking-tighter"
          >
            ${{ cartStore.cartTotal.toFixed(2) }}
          </span>
        </div>
        <div class="text-right">
          <span
            class="text-[10px] font-bold text-amber-700 dark:text-amber-500 tracking-wider uppercase flex items-center justify-end gap-1 mb-0.5"
          >
            KHR (៛)
          </span>
          <span
            class="text-xl font-headline font-extrabold text-amber-700 dark:text-amber-500 leading-none"
          >
            {{ cartStore.cartTotalInRiel.toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- Action Checkout Buttons -->
      <div class="grid grid-cols-2 gap-3">
        <Button
          type="button"
          :disabled="cartStore.items.length === 0"
          variant="secondary"
          class="h-auto bg-stone-50 hover:bg-stone-100 dark:bg-stone-850 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-750 text-stone-800 dark:text-stone-100 rounded-2xl py-4.5 flex flex-col items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50"
          @click="handlePayCash"
        >
          <span class="material-symbols-outlined text-2xl">payments</span>
          <span class="text-sm font-extrabold">{{ t('cart.payWithCash') }}</span>
        </Button>
        <Button
          type="button"
          disabled
          class="h-auto bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl py-4.5 flex flex-col items-center justify-center gap-1.5 active:scale-98 transition-all disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-2xl">qr_code_scanner</span>
          <span class="text-sm font-extrabold">{{ t('cart.payWithQR') }}</span>
        </Button>
      </div>
    </div>
  </aside>
</template>
