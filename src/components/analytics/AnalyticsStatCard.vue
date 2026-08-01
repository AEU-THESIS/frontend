<script setup lang="ts">
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import type { AnalyticsStatCardProps } from '@/types/analytics.types'

defineProps<AnalyticsStatCardProps>()
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-2xl border border-transparent bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-stone-800 dark:bg-stone-900/50"
  >
    <div class="flex items-start justify-between">
      <div class="min-w-0">
        <p
          class="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3] dark:text-stone-500"
        >
          {{ label }}
        </p>
        <h3 class="mt-2 text-3xl font-bold text-[#1A1C1C] dark:text-stone-100">
          {{ value }}
        </h3>
      </div>
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
        :class="iconBgClass"
      >
        <component :is="icon" class="size-5" :class="iconColorClass" />
      </div>
    </div>

    <div v-if="trend != null" class="mt-4 flex items-center gap-1.5">
      <span
        class="inline-flex items-center gap-1 text-xs font-bold"
        :class="trend >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'"
      >
        <TrendingUp v-if="trend >= 0" class="size-3.5" />
        <TrendingDown v-else class="size-3.5" />
        {{ trend >= 0 ? '+' : '' }}{{ trend }}%
      </span>
      <span class="text-xs font-medium text-[#A3A3A3] dark:text-stone-500">
        {{ trendLabel }}
      </span>
    </div>
    <div v-else-if="trendLabel" class="mt-4">
      <span class="text-xs font-medium text-[#A3A3A3] dark:text-stone-500">{{ trendLabel }}</span>
    </div>
  </div>
</template>
