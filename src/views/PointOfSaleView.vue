<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/store/useProductStore'
import { useCartStore } from '@/store/useCartStore'
import { useShopSettingsStore } from '@/store/useShopSettingsStore'
import type { Product } from '@/types/product.types'
import type { OrderResult, CheckoutSuccessData } from '@/types/order.types'
import { PRICE_MODE } from '@/constants/product'
import { round2, roundRielDown } from '@/utils/money'
import ProductCard from '@/components/pos/ProductCard.vue'
import ProductModifierModal from '@/components/pos/ProductModifierModal.vue'
import CashPaymentModal from '@/components/pos/CashPaymentModal.vue'
import CheckoutSuccessModal from '@/components/pos/CheckoutSuccessModal.vue'
import { AppInput } from '@/components/ui/input'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const productStore = useProductStore()
const cartStore = useCartStore()
const shopSettingsStore = useShopSettingsStore()

const searchInput = ref('')
const selectedProductForOptions = ref<Product | null>(null)
const isModifiersModalOpen = ref(false)
const isSuccessModalOpen = ref(false)

const checkoutResult = ref<CheckoutSuccessData | null>(null)

// Use the shop's configured exchange rate (hydrated from Shop Settings) for the
// POS, and keep it in sync if an admin changes it while the POS is open. The
// server remains the authority at checkout; this only drives what is displayed.
onMounted(async () => {
  cartStore.exchangeRate = shopSettingsStore.exchange_rate
  try {
    await Promise.all([
      productStore.fetchCategories(),
      productStore.fetchProducts(),
      cartStore.fetchActivePromotions(),
    ])
  } catch {
    toast.error(t('cart.fetchFailed'))
  }
})

watch(
  () => shopSettingsStore.exchange_rate,
  rate => {
    cartStore.exchangeRate = rate
  }
)

// Search input watcher
watch(searchInput, newVal => {
  productStore.setSearchQuery(newVal)
})

const handleCategorySelect = (categoryId?: number) => {
  productStore.setCategoryFilter(categoryId)
}

const handleProductSelect = (product: Product) => {
  if (product.optionSets && product.optionSets.length > 0) {
    selectedProductForOptions.value = product
    isModifiersModalOpen.value = true
  } else if (product.priceMode === PRICE_MODE.BY_SIZE) {
    // A by-size product has no base price — its price lives in the size option.
    // Without any option set to choose a size from, it can only be added at 0.00,
    // so block it rather than sell it for nothing.
    toast.error(t('cart.sizeRequired'))
  } else {
    // For a "Buy 1 Get 1" item, add the pair in one tap (one paid + one free) so the
    // barista immediately sees they should make two and charge for one. The backend
    // recomputes the discount authoritatively at checkout.
    const promo = cartStore.promotionForProduct(product.id, product.categoryId)
    const isBogo = promo?.discountType === 'BOGO'
    cartStore.addToCart(
      product.id,
      product.categoryId,
      product.name,
      product.imageUrl,
      Number(product.price),
      isBogo ? 2 : 1,
      []
    )
    toast.success(
      isBogo
        ? t('cart.addedBogo', { name: product.name })
        : t('cart.addedToCart', { name: product.name })
    )
  }
}

const handlePaymentSuccess = (result: OrderResult) => {
  cartStore.isCashModalOpen = false

  // Derive both currency views of the change from the SERVER's figures, so the
  // receipt shows exactly what was charged/returned (not the browser's math).
  const rate = Number(result.exchangeRateSnapshot)
  const serverChange = Number(result.changeAmount)
  const changeKHR =
    result.paymentCurrency === 'KHR' ? serverChange : roundRielDown(serverChange * rate)
  const changeUSD = result.paymentCurrency === 'KHR' ? round2(serverChange / rate) : serverChange

  checkoutResult.value = {
    orderId: result.id,
    orderNumber: result.orderNumber,
    totalAmount: Number(result.totalAmount),
    receivedAmount: Number(result.receivedAmount),
    paymentCurrency: result.paymentCurrency,
    exchangeRateSnapshot: rate,
    changeUSD,
    changeKHR,
  }
  isSuccessModalOpen.value = true
}

const handleSuccessModalClose = () => {
  isSuccessModalOpen.value = false
  checkoutResult.value = null
}
</script>

<template>
  <div class="flex flex-col h-full w-full select-none bg-stone-50 dark:bg-stone-900">
    <!-- POS Catalog Header -->
    <header class="p-6 pb-4 flex flex-col gap-5 shrink-0 select-none">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1
          class="text-2xl font-headline font-bold tracking-tight text-stone-900 dark:text-stone-50"
        >
          {{ t('home.title') }}
        </h1>
        <div
          class="flex items-center bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-xl px-4 py-2.5 w-full sm:w-80 md:w-96 focus-within:ring-2 focus-within:ring-amber-500/30 transition-all select-none"
        >
          <span class="material-symbols-outlined text-stone-400 dark:text-stone-600 text-lg"
            >search</span
          >
          <AppInput
            v-model="searchInput"
            class="bg-transparent border-none focus-visible:ring-0 shadow-none w-full text-stone-800 dark:text-stone-50 ml-2.5 font-body text-sm outline-none px-0 h-auto"
            :placeholder="t('home.searchPlaceholder')"
            type="text"
          />
          <Button
            v-if="searchInput"
            type="button"
            variant="tertiary"
            size="icon"
            class="h-6 w-6 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-850 hover:no-underline p-0 flex items-center justify-center bg-transparent shadow-none"
            @click="searchInput = ''"
          >
            <span class="material-symbols-outlined text-base">close</span>
          </Button>
        </div>
      </div>

      <!-- Scrollable Category Navigation Chips -->
      <div class="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide select-none">
        <Button
          type="button"
          :variant="productStore.selectedCategoryId === undefined ? 'primary' : 'secondary'"
          :class="[
            'px-5 py-2.5 h-auto rounded-xl font-bold whitespace-nowrap text-xs transition-all active:scale-98 border',
            productStore.selectedCategoryId === undefined
              ? 'bg-[#2D241E] text-white dark:bg-stone-100 dark:text-stone-900 border-[#2D241E] dark:border-stone-100'
              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 text-stone-700 dark:text-stone-300 hover:border-[#2D241E] hover:text-[#2D241E] dark:hover:border-stone-100 dark:hover:text-stone-100 hover:bg-[#2D241E]/5 dark:hover:bg-stone-900',
          ]"
          @click="handleCategorySelect(undefined)"
        >
          {{ t('home.categories.all') }}
        </Button>
        <Button
          v-for="cat in productStore.categories"
          :key="cat.id"
          type="button"
          :variant="productStore.selectedCategoryId === cat.id ? 'primary' : 'secondary'"
          :class="[
            'px-5 py-2.5 h-auto rounded-xl font-bold whitespace-nowrap text-xs transition-all active:scale-98 border',
            productStore.selectedCategoryId === cat.id
              ? 'bg-[#2D241E] text-white dark:bg-stone-100 dark:text-stone-900 border-[#2D241E] dark:border-stone-100'
              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-850 text-stone-700 dark:text-stone-300 hover:border-[#2D241E] hover:text-[#2D241E] dark:hover:border-stone-100 dark:hover:text-stone-100 hover:bg-[#2D241E]/5 dark:hover:bg-stone-900',
          ]"
          @click="handleCategorySelect(cat.id)"
        >
          {{ cat.name }}
        </Button>
      </div>
    </header>

    <!-- Products Catalog Scrolling Grid -->
    <div class="flex-1 overflow-y-auto p-6 pt-2 scrollbar-hide">
      <!-- Loading Indicators -->
      <div
        v-if="productStore.isProductsLoading && productStore.products.length === 0"
        class="h-64 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-3"
      >
        <div
          class="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full"
        ></div>
        <span class="text-xs font-bold uppercase tracking-wider">{{
          t('cart.loadingCatalog')
        }}</span>
      </div>

      <!-- Empty Catalog State -->
      <div
        v-else-if="productStore.products.length === 0"
        class="h-64 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-2 select-none"
      >
        <span class="material-symbols-outlined text-5xl">local_cafe</span>
        <span class="text-sm font-bold">{{ t('home.noProducts') }}</span>
      </div>

      <!-- Premium Grid View -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
      >
        <ProductCard
          v-for="prod in productStore.products"
          :key="prod.id"
          :product="prod"
          :promotion="cartStore.promotionForProduct(prod.id, prod.categoryId)"
          @select="handleProductSelect"
        />
      </div>
    </div>

    <!-- MODAL OVERLAYS -->

    <!-- Interactive Options Dialog -->
    <ProductModifierModal
      :product="selectedProductForOptions"
      :is-open="isModifiersModalOpen"
      @close="isModifiersModalOpen = false"
    />

    <!-- Touch Numpad Payment Dialog -->
    <CashPaymentModal
      :is-open="cartStore.isCashModalOpen"
      @close="cartStore.isCashModalOpen = false"
      @success="handlePaymentSuccess"
    />

    <!-- Order Receipt Success Dialog -->
    <CheckoutSuccessModal
      :is-open="isSuccessModalOpen"
      :order-result="checkoutResult"
      @close="handleSuccessModalClose"
    />
  </div>
</template>
