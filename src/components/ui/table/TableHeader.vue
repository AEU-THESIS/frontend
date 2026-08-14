<script setup lang="ts">
import type { TablePrimitiveProps } from '@/types/table.types'
import { cn } from '@/lib/utils'

const props = defineProps<TablePrimitiveProps>()
</script>

<template>
  <thead data-slot="table-header" :class="cn('[&_tr]:border-b', props.class)">
    <slot />
  </thead>
</template>
