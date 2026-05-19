<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/store/useProductStore'
import { useCartStore } from '@/store/useCartStore'
import type { Product } from '@/types/product.types'
import type { OrderResult } from '@/types/order.types'
import ProductCard from '@/components/pos/ProductCard.vue'
import ProductModifierModal from '@/components/pos/ProductModifierModal.vue'
import CashPaymentModal from '@/components/pos/CashPaymentModal.vue'
import CheckoutSuccessModal from '@/components/pos/CheckoutSuccessModal.vue'
import { Input } from '@/components/ui/input'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const productStore = useProductStore()
const cartStore = useCartStore()

const searchInput = ref('')
const selectedProductForOptions = ref<Product | null>(null)
const isModifiersModalOpen = ref(false)
const isSuccessModalOpen = ref(false)
interface CheckoutSuccessData {
  orderId: number
  orderNumber: string
  totalAmount: number
  receivedAmount: number
  paymentCurrency: string
  changeUSD: number
  changeKHR: number
}

const checkoutResult = ref<CheckoutSuccessData | null>(null)

onMounted(async () => {
  try {
    await Promise.all([productStore.fetchCategories(), productStore.fetchProducts()])
  } catch {
    toast.error(t('cart.fetchFailed'))
  }
})

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
  } else {
    // Directly add simple products with no custom modifiers
    cartStore.addToCart(product.id, product.name, product.imageUrl, Number(product.price), 1, [])
    toast.success(t('cart.addedToCart', { name: product.name }))
  }
}

const handlePaymentSuccess = (result: OrderResult & { changeUSD: number; changeKHR: number }) => {
  cartStore.isCashModalOpen = false
  checkoutResult.value = {
    orderId: result.id,
    orderNumber: result.orderNumber,
    totalAmount: result.totalAmount,
    receivedAmount: result.receivedAmount,
    paymentCurrency: result.paymentCurrency,
    changeUSD: result.changeUSD,
    changeKHR: result.changeKHR,
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
          <Input
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
