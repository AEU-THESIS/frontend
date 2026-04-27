<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <!-- Top Bar -->
    <header class="p-8 pb-4 flex flex-col gap-6 shrink-0">
      <div class="flex items-center justify-between">
        <h1
          class="text-3xl font-bold font-headline tracking-tight text-stone-800 dark:text-stone-50"
        >
          {{ t('home.title') }}
        </h1>
        <div
          class="flex items-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-2.5 w-96 focus-within:ring-2 ring-amber-700/20 transition-all"
        >
          <span class="material-symbols-outlined text-stone-400">search</span>
          <Input
            class="bg-transparent border-none focus-visible:ring-0 shadow-none w-full text-stone-800 dark:text-stone-50 ml-3 font-body text-sm outline-none px-0 h-auto"
            :placeholder="t('home.searchPlaceholder')"
            type="text"
          />
        </div>
      </div>

      <!-- Categories -->
      <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          class="px-6 py-2 h-auto bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 rounded-lg font-medium whitespace-nowrap text-sm shadow-sm transition-colors"
        >
          {{ t('home.categories.all') }}
        </Button>
        <Button
          variant="outline"
          class="px-6 py-2 h-auto bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium whitespace-nowrap text-sm transition-colors"
        >
          {{ t('home.categories.coffee') }}
        </Button>
        <Button
          variant="outline"
          class="px-6 py-2 h-auto bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium whitespace-nowrap text-sm transition-colors"
        >
          {{ t('home.categories.tea') }}
        </Button>
        <Button
          variant="outline"
          class="px-6 py-2 h-auto bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium whitespace-nowrap text-sm transition-colors"
        >
          {{ t('home.categories.bakery') }}
        </Button>
        <Button
          variant="outline"
          class="px-6 py-2 h-auto bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium whitespace-nowrap text-sm transition-colors"
        >
          {{ t('home.categories.breakfast') }}
        </Button>
        <Button
          variant="outline"
          class="px-6 py-2 h-auto bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-50 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg font-medium whitespace-nowrap text-sm transition-colors"
        >
          {{ t('home.categories.pastry') }}
        </Button>
      </div>
    </header>

    <!-- Product Grid -->
    <div class="flex-1 overflow-y-auto p-8 pt-2">
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <!-- Product Card -->
        <div
          class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex flex-col gap-4 group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] duration-200"
        >
          <div class="aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
            <img
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-alt="creamy iced latte with espresso layers"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUs8AZCPgjcCAtdSvqsHKlJgoKb2RDf6Lt_-eoOTWNMXAM0ITXANmKdQpp9C-vyY-3SBJjXwAXo08WoE3T6WL5Vy6lAeA44wVgfJSoV0DGLbi04epDBgQd89P9Y33_O2oWMPUy5uhazaON7l1h7_Ms2meSkSzZjAPTbJRYQ_ewVQiza0LSYuxSa04-ATwBi2c0hjpbt0_TdEiy39y5YyUQf59lwDadLN7LxveIbrb768HmctxasufEXVTwYHAfQblUhZ6MQ-_Kd8A"
            />
          </div>
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-50 text-base">
              {{ t('home.products.icedLatte') }}
            </h3>
            <div class="flex justify-between items-center mt-1">
              <p class="text-amber-700 dark:text-amber-500 font-bold text-[15px]">$3.50</p>
              <span
                class="material-symbols-outlined text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors"
                >add_circle_outline</span
              >
            </div>
          </div>
        </div>
        <!-- Card -->
        <div
          class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex flex-col gap-4 group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] duration-200"
        >
          <div class="aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
            <img
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-alt="flaky golden brown croissant"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqWYPIvB-8jzM2W-OXlYSfbzNgPlwZKlWqYggo9SJMc7_-a5oHKTfABxpD7TRXAtHd2kdtws7FfygwHr9bxyJK73kEo9SnHlyhXS2f5IydppnhDKFkzLb6wzY1SyVU8a__Fov2cLQGlPjOo3Z95AbnRpQpbiTG510B7kNZtIh2Qll_9CfGjUPQ04k9a-4wozXrEeXMMYOTvezQDHGZgXdhxbBoX4AOJA5M0cfhTWYbgNaLfP7k4a1uMri1hTHRJBR3UdzPzc-wOJY"
            />
          </div>
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-50 text-base">
              {{ t('home.products.croissant') }}
            </h3>
            <div class="flex justify-between items-center mt-1">
              <p class="text-amber-700 dark:text-amber-500 font-bold text-[15px]">$2.25</p>
              <span
                class="material-symbols-outlined text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors"
                >add_circle_outline</span
              >
            </div>
          </div>
        </div>
        <!-- Card -->
        <div
          class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex flex-col gap-4 group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] duration-200"
        >
          <div class="aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
            <img
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-alt="artisan avocado toast"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9zE3m17nBMC7TwUQ3p2QOSRlyQnX0nfqGA9hWkF-VK7bC0bP2N_NNJk23NvK7pO8x_3vUSit1k_UPXIUKkakY1-bYTZmZf37b6QjulipOd1-0BB4yt3OLHt6uPdh85SVsw4V1bexuN_2uji703VigvdaQ54lEgh9ZUFFuHUaH4lYjjnsYAyNEbbJ080P1t5pQcISH1HJ2uJ18hwzy2-swqM5eClMaWpfKugbsY3My0mZkzS6h2Y_TQ8sDN1ZstQGwQ7HmXQMuF7g"
            />
          </div>
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-50 text-base">
              {{ t('home.products.avocadoToast') }}
            </h3>
            <div class="flex justify-between items-center mt-1">
              <p class="text-amber-700 dark:text-amber-500 font-bold text-[15px]">$6.50</p>
              <span
                class="material-symbols-outlined text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors"
                >add_circle_outline</span
              >
            </div>
          </div>
        </div>
        <!-- Card -->
        <div
          class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl flex flex-col gap-4 group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] duration-200"
        >
          <div class="aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
            <img
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-alt="vibrant matcha latte"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO1Uhq1wMsVT9zwuSu096rKODLHX_N91mWzs3FXVeR2n9YVLcuK8rCslXxMtY_E9tyB0UGk8I_Jg-v0ROJQ0R4a6DgVexvvFoCp1HudBChlCk3UeU54xWHVPtWVUpAIB0De8CIMCqphuV9MQFjSYJG3y3wa_H1WgoBHS-InCPyeVbBdfT7U97aQNjCm2P-pfX_Fik0yEKBntpX3slweomsZQGf9ZPPxVEjEEWDeM5Er5Vr5kgxQmgFdz9jhosVAdAtpxVJh5R0too"
            />
          </div>
          <div>
            <h3 class="font-bold text-stone-800 dark:text-stone-50 text-base">
              {{ t('home.products.matchaLatte') }}
            </h3>
            <div class="flex justify-between items-center mt-1">
              <p class="text-amber-700 dark:text-amber-500 font-bold text-[15px]">$4.25</p>
              <span
                class="material-symbols-outlined text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors"
                >add_circle_outline</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
