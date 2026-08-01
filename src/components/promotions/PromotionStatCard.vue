<script setup lang="ts">
import type { Component } from 'vue'
import { Card } from '@/components/ui/card'

defineProps<{
  label: string
  value: number | string
  icon: Component
  bgColorClass: string
  iconColorClass: string
}>()
</script>

<template>
  <Card
    class="flex items-center gap-5 rounded-2xl border border-transparent bg-white px-7 py-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
  >
    <div class="flex size-14 shrink-0 items-center justify-center rounded-xl" :class="bgColorClass">
      <component :is="icon" class="size-6" :class="iconColorClass" />
    </div>
    <div class="min-w-0">
      <p class="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
        {{ label }}
      </p>
      <p class="mt-1 text-3xl font-bold text-[#1A1C1C] dark:text-stone-100">
        {{ value }}
      </p>
    </div>
  </Card>
</template>
