<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { usePublicShopStore } from '@/store/usePublicShopStore'
import { usePublicCartStore } from '@/store/usePublicCartStore'
import { useTelegram } from '@/composables/useTelegram'
import { getImageUrl } from '@/utils/image'
import { APP_ROUTES } from '@/constants/appRoutes'
import PublicProductModifier from '@/components/public/PublicProductModifier.vue'
import type { Product } from '@/types/product.types'
import shopLogo from '@/assets/shop-logo.png'
import LangFlagToggle from '@/components/public/LangFlagToggle.vue'

const router = useRouter()
const { t } = useI18n()
const shopStore = usePublicShopStore()
const cart = usePublicCartStore()
const tg = useTelegram()

const search = ref('')
const selectedCategory = ref<number | 'all'>('all')
const modifierProduct = ref<Product | null>(null)
const modifierOpen = ref(false)

const currency = computed(() => shopStore.shop?.currencySymbol ?? '$')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return shopStore.products.filter(p => {
    const matchCat = selectedCategory.value === 'all' || p.categoryId === selectedCategory.value
    const matchSearch = !q || p.name.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
})

const priceLabel = (p: Product) =>
  p.price == null ? t('publicOrder.from') : `${currency.value}${Number(p.price).toFixed(2)}`

const onProductTap = (p: Product) => {
  if (p.optionSets.length > 0) {
    modifierProduct.value = p
    modifierOpen.value = true
  } else {
    cart.addItem(p, 1, [])
    tg.haptic('medium')
    toast.success(t('publicOrder.addedToCart'))
  }
}

const goCheckout = () =>
  router.push({ name: APP_ROUTES.PUBLIC_CHECKOUT.name, params: { slug: shopStore.slug } })
const goMyOrders = () =>
  router.push({ name: APP_ROUTES.PUBLIC_MY_ORDERS.name, params: { slug: shopStore.slug } })

const selectCategory = (c: number | 'all') => {
  selectedCategory.value = c
  tg.haptic('light')
}

// Collapsing header (Facebook-style): hide the brand row + search on scroll-down
// and reveal them on scroll-up, so more of the menu is visible. A small threshold
// avoids flicker, and near the very top the header is always shown.
const headerHidden = ref(false)
let lastScrollY = 0
const onScroll = () => {
  const y = window.scrollY
  if (y < 48) {
    headerHidden.value = false
  } else if (y > lastScrollY + 6) {
    headerHidden.value = true
  } else if (y < lastScrollY - 6) {
    headerHidden.value = false
  }
  lastScrollY = y
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="flex flex-1 flex-col pb-24">
    <!-- Header -->
    <!-- Whole header slides up on scroll-down, back on scroll-up. Transform only, so
         it never changes page height — this avoids the collapse/expand feedback loop. -->
    <header
      class="sticky top-0 z-20 bg-stone-50/95 backdrop-blur transition-transform duration-300 ease-out will-change-transform dark:bg-stone-900/95"
      :class="headerHidden ? '-translate-y-full' : 'translate-y-0'"
    >
      <div class="px-4 pt-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img
              :src="shopLogo"
              alt=""
              class="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-stone-200 dark:ring-stone-700"
            />
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-primary">
                {{ t('publicOrder.orderNow') }}
              </p>
              <h1 class="text-lg font-extrabold leading-tight text-stone-900 dark:text-stone-50">
                {{ shopStore.shop?.name }}
              </h1>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <LangFlagToggle />
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition active:scale-90 dark:bg-stone-800 dark:text-stone-300"
              :title="t('publicOrder.myOrders')"
              @click="goMyOrders"
            >
              <span class="material-symbols-outlined">receipt_long</span>
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="relative mt-3">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          >
            search
          </span>
          <input
            v-model="search"
            type="search"
            :placeholder="t('publicOrder.searchPlaceholder')"
            class="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary dark:border-stone-700 dark:bg-stone-800"
          />
        </div>
      </div>

      <!-- Category chips -->
      <div class="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-2 pt-2">
        <button
          class="whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95"
          :class="
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
          "
          @click="selectCategory('all')"
        >
          {{ t('publicOrder.all') }}
        </button>
        <button
          v-for="c in shopStore.categories"
          :key="c.id"
          class="whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95"
          :class="
            selectedCategory === c.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
          "
          @click="selectCategory(c.id)"
        >
          {{ c.name }}
        </button>
      </div>
    </header>

    <!-- Products -->
    <main class="flex-1 px-4 pt-2">
      <p v-if="filtered.length === 0" class="py-16 text-center text-sm text-stone-400">
        {{ t('publicOrder.emptyMenu') }}
      </p>

      <div v-else class="grid grid-cols-2 gap-3">
        <button
          v-for="(p, i) in filtered"
          :key="p.id"
          class="card-in flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white text-left transition-transform active:scale-95 dark:border-stone-800 dark:bg-stone-800"
          :style="{ animationDelay: Math.min(i * 35, 350) + 'ms' }"
          @click="onProductTap(p)"
        >
          <div class="aspect-square w-full bg-stone-100 dark:bg-stone-700">
            <img
              v-if="p.imageUrl"
              :src="getImageUrl(p.imageUrl)"
              :alt="p.name"
              loading="lazy"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-stone-300">
              <span class="material-symbols-outlined text-4xl">local_cafe</span>
            </div>
          </div>
          <div class="flex flex-1 flex-col justify-between p-2.5">
            <p class="line-clamp-2 text-sm font-bold text-stone-800 dark:text-stone-100">
              {{ p.name }}
            </p>
            <p class="mt-1 text-sm font-extrabold text-primary">{{ priceLabel(p) }}</p>
          </div>
        </button>
      </div>
    </main>

    <!-- Sticky cart bar -->
    <transition name="cartbar">
      <div
        v-if="cart.count > 0"
        class="tg-safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-4"
      >
        <button
          class="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
          @click="goCheckout"
        >
          <span class="flex items-center gap-2 font-bold">
            <span
              :key="cart.count"
              class="bump flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs"
            >
              {{ cart.count }}
            </span>
            {{ t('publicOrder.viewCart') }}
          </span>
          <span class="font-extrabold">{{ currency }}{{ cart.total.toFixed(2) }}</span>
        </button>
      </div>
    </transition>

    <PublicProductModifier
      :product="modifierProduct"
      :is-open="modifierOpen"
      :currency-symbol="currency"
      @close="modifierOpen = false"
    />
  </div>
</template>

<style scoped>
.card-in {
  animation: cardIn 0.35s ease both;
}
@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Cart bar slides up on first item, down when emptied. */
.cartbar-enter-active,
.cartbar-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity 0.2s ease;
}
.cartbar-enter-from,
.cartbar-leave-to {
  transform: translateY(140%);
  opacity: 0;
}

/* Count badge pops each time the quantity changes. */
.bump {
  animation: bump 0.3s ease;
}
@keyframes bump {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
