<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string | number
  icon?: Component | null
  bgColorClass: string
  iconColorClass: string
  isDot?: boolean
}>()
</script>

<template>
  <div
    class="bg-white rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm border border-[#FAFAFA] group transition-all hover:shadow-md"
  >
    <div
      class="size-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
      :class="bgColorClass"
    >
      <div v-if="isDot" class="size-2.5 rounded-full" :class="iconColorClass"></div>
      <component :is="icon" v-else class="size-6" :class="iconColorClass" />
    </div>
    <div>
      <p class="text-[11px] font-bold text-[#737373] uppercase tracking-wider mb-0.5">
        {{ label }}
      </p>
      <h3 class="text-2xl font-bold text-[#1A1C1C]">{{ value }}</h3>
    </div>
  </div>
</template>
