<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <aside
    class="w-[35%] flex flex-col bg-stone-100 dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800"
  >
    <!-- Sidebar Header -->
    <div class="p-8 pb-4">
      <div class="flex items-center justify-between mb-6">
        <span class="text-xl font-bold font-headline text-stone-800 dark:text-stone-50"
          >{{ t('cart.order') }} #1042</span
        >
        <div class="bg-stone-200 dark:bg-stone-800 flex rounded-lg p-1 w-fit">
          <Button
            variant="ghost"
            class="px-4 py-1.5 h-auto rounded-lg bg-white dark:bg-stone-600 text-stone-800 dark:text-stone-50 text-sm font-semibold shadow-sm hover:bg-white/90 dark:hover:bg-stone-500"
          >
            {{ t('cart.dineIn') }}
          </Button>
          <Button
            variant="ghost"
            class="px-4 py-1.5 h-auto rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 text-sm font-medium"
          >
            {{ t('cart.takeaway') }}
          </Button>
        </div>
      </div>
      <div class="h-px bg-stone-200 dark:bg-stone-800 w-full"></div>
    </div>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto px-8 space-y-4">
      <!-- Item -->
      <div
        class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex items-center gap-4 group"
      >
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900 shrink-0">
          <img
            class="w-full h-full object-cover"
            data-alt="iced latte"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwgmRCsnptN7Hfr-fmSECvV8MksjuO38QQ97IV54RcUTvwqCvrvuGKXW4ETbb_O6-I0KwWPp_5Q959Zw3Wl7Wyp0yNb2p7w443ziYNX140_W8fsL-1Fnv2ZhBg9_VcKQauE4s0qkx2tG24Y4JWAt5DZbOHCwvrlv_OQ6MU0sy7jkuDsNvqfs6SD8Pu4tXLRhNmffGJObFO8Zh3lWTL7EgMGZ497q8MRTucKeyQtNWv8RBvJpiI0Rcjwut_qzwNhItl-lHQKdZ88B0"
          />
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-stone-800 dark:text-stone-50 text-sm">
            {{ t('home.products.icedLatte') }}
          </h4>
          <p
            class="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase tracking-tight"
          >
            {{ t('cart.options.oatMilk') }}
          </p>
        </div>
        <div class="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 rounded-lg p-1">
          <Button
            variant="outline"
            size="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-800 dark:text-stone-50"
          >
            <span class="material-symbols-outlined text-sm">remove</span>
          </Button>
          <span class="font-bold text-stone-800 dark:text-stone-50 px-1 text-sm">1</span>
          <Button
            variant="outline"
            size="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-800 dark:text-stone-50"
          >
            <span class="material-symbols-outlined text-sm">add</span>
          </Button>
        </div>
        <div class="w-14 text-right font-bold text-stone-800 dark:text-stone-50 text-sm">$3.50</div>
      </div>
      <!-- Item -->
      <div
        class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex items-center gap-4 group"
      >
        <div class="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900 shrink-0">
          <img
            class="w-full h-full object-cover"
            data-alt="butter croissant"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR1yE12sb6FMsl8ReNy8Y7qLzLVUwlVn88A-01XokHiCTFkV3nbTHMQcXjnS2Kkuu01E3_LLATFzlWttLhCMLtZ4o2b65x9U-mnobNqYa-ydWG6Fi0MDMVevRC0jQKDsTBYHM9AOE9iMOmi63gOaTfGzT5BMg8vkd2nIT5L1_FZfy4tcjFOjI319LQvDuul2kgLEk6z-N9liqKk3l3r86t56oAFPeT9rRFPJEIq10NiKvBQ5RXg8ZmZZmgxF40clmam7WsoOvb5vE"
          />
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-stone-800 dark:text-stone-50 text-sm">
            {{ t('home.products.croissant') }}
          </h4>
          <p
            class="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase tracking-tight"
          >
            {{ t('cart.options.warmed') }}
          </p>
        </div>
        <div class="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 rounded-lg p-1">
          <Button
            variant="outline"
            size="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-800 dark:text-stone-50"
          >
            <span class="material-symbols-outlined text-sm">remove</span>
          </Button>
          <span class="font-bold text-stone-800 dark:text-stone-50 px-1 text-sm">2</span>
          <Button
            variant="outline"
            size="icon"
            class="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-800 dark:text-stone-50"
          >
            <span class="material-symbols-outlined text-sm">add</span>
          </Button>
        </div>
        <div class="w-14 text-right font-bold text-stone-800 dark:text-stone-50 text-sm">$4.50</div>
      </div>
    </div>

    <!-- Cart Summary -->
    <div
      class="p-8 pt-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 mt-auto flex flex-col gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 relative"
    >
      <div
        class="flex justify-between items-center text-sm font-medium text-stone-500 dark:text-stone-400"
      >
        <span>{{ t('cart.subtotal') }}</span>
        <span>$8.00</span>
      </div>
      <div
        class="flex justify-between items-center text-sm font-medium text-amber-700 dark:text-amber-500 group cursor-pointer w-fit"
      >
        <div class="flex items-center gap-1 group-hover:underline underline-offset-4">
          <span class="material-symbols-outlined text-base">local_offer</span>
          <span>{{ t('cart.addDiscount') }}</span>
        </div>
        <span>-$0.00</span>
      </div>
      <div class="h-px bg-stone-200 dark:bg-stone-800 w-full my-2"></div>
      <div class="flex justify-between items-end mb-4">
        <div class="flex flex-col">
          <span
            class="text-xs font-bold text-stone-500 dark:text-stone-400 tracking-wider uppercase mb-1"
            >{{ t('cart.totalAmount') }}</span
          >
          <span
            class="text-4xl font-headline font-bold text-stone-800 dark:text-stone-50 leading-none tracking-tighter"
            >$8.00</span
          >
        </div>
        <div class="text-right">
          <span
            class="text-[10px] font-bold text-amber-700 dark:text-amber-500 tracking-wider uppercase flex items-center justify-end gap-1 mb-0.5"
          >
            {{ t('cart.khr') }}
            <span class="material-symbols-outlined text-[10px]">swap_vert</span>
          </span>
          <span class="text-xl font-bold text-amber-700 dark:text-amber-500 leading-none"
            >32,800</span
          >
        </div>
      </div>
      <div class="flex gap-3">
        <Button
          variant="outline"
          class="flex-1 h-auto bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-50 rounded-xl py-4 flex flex-col items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-700 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">payments</span>
          <span class="text-sm font-bold">{{ t('cart.payWithCash') }}</span>
        </Button>
        <Button
          class="flex-1 h-auto bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl py-4 flex flex-col items-center justify-center gap-2 hover:bg-stone-700 dark:hover:bg-stone-200 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">qr_code_scanner</span>
          <span class="text-sm font-bold">{{ t('cart.payWithQR') }}</span>
        </Button>
      </div>
    </div>
  </aside>
</template>
