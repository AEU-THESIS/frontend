<script setup lang="ts">
import type { TablePrimitiveProps } from '@/types/table.types'
import { cn } from '@/lib/utils'

const props = defineProps<TablePrimitiveProps>()
</script>

<template>
  <tr
    data-slot="table-row"
    :class="
      cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', props.class)
    "
  >
    <slot />
  </tr>
</template>
