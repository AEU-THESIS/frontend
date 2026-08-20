<script setup lang="ts">
import type { TablePrimitiveProps } from '@/types/table.types'
import { cn } from '@/lib/utils'

const props = defineProps<TablePrimitiveProps>()
</script>

<template>
  <tbody data-slot="table-body" :class="cn('[&_tr:last-child]:border-0', props.class)">
    <slot />
  </tbody>
</template>
