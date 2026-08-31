<script setup lang="ts">
import type { Component } from 'vue'

// labelClass / valueClass let a caller tune the typography per context (e.g. the
// Sales Summary tiles pass a responsive value size so a long "$ / KHR" figure
// scales down on narrow screens instead of overflowing the card).
withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon?: Component | null
    bgColorClass: string
    iconColorClass: string
    isDot?: boolean
    labelClass?: string
    valueClass?: string
  }>(),
  {
    icon: null,
    isDot: false,
    labelClass: 'text-[11px]',
    valueClass: 'text-2xl',
  }
)
</script>

<template>
  <div
    class="bg-white dark:bg-stone-900/50 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border border-transparent dark:border-stone-800 group transition-all hover:shadow-md"
  >
    <div
      class="size-12 shrink-0 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
      :class="bgColorClass"
    >
      <div v-if="isDot" class="size-2.5 rounded-full" :class="iconColorClass"></div>
      <component :is="icon" v-else class="size-6" :class="iconColorClass" />
    </div>
    <div class="min-w-0 flex-1">
      <p
        class="font-bold text-[#737373] dark:text-stone-400 uppercase tracking-wider mb-0.5"
        :class="labelClass"
      >
        {{ label }}
      </p>
      <h3
        class="font-bold text-[#1A1C1C] dark:text-stone-100 leading-tight break-words"
        :class="valueClass"
        :title="String(value)"
      >
        {{ value }}
      </h3>
    </div>
  </div>
</template>
