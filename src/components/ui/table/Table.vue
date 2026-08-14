<script setup lang="ts">
import type { TablePrimitiveProps } from '@/types/table.types'
import { cn } from '@/lib/utils'

const props = defineProps<TablePrimitiveProps>()
</script>

<template>
  <div data-slot="table-container" class="relative w-full overflow-auto">
    <table data-slot="table" :class="cn('w-full caption-bottom text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
