<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SidebarNavLeaf } from '@/types/sidebar.types'

// One row of a submenu. Rendered indented under an expanded parent, and again
// inside the pop-out panel when the sidebar is collapsed to icons — the two
// differ only in padding, so they share this component rather than the markup
// being written twice.
//
// The link and the action row are written out separately instead of through
// `<component :is>`: `Button` is a globally registered component, so a dynamic
// 'button' would resolve to it and pick up its primary styling.
const props = defineProps<{
  item: SidebarNavLeaf
  active: boolean
  variant: 'inline' | 'popout'
}>()

const emit = defineEmits<{ select: [item: SidebarNavLeaf] }>()

const { t } = useI18n()

// Indented past the parent's own icon so the nesting still reads, while the
// child icon stays a size down from it.
const rowClass = computed(() => [
  'flex w-full items-center gap-3 whitespace-nowrap rounded-lg text-left text-[14px] font-semibold transition-colors',
  props.variant === 'inline' ? 'py-2 pl-9 pr-3' : 'px-3 py-2',
  props.active
    ? 'bg-[#fcf3eb] text-[#b05a18] dark:bg-amber-900/20 dark:text-amber-500'
    : 'text-stone-500 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:bg-stone-800/50',
])
</script>

<template>
  <router-link v-if="item.route" :to="item.route" :class="rowClass" @click="emit('select', item)">
    <span class="material-symbols-outlined shrink-0 text-lg" :data-icon="item.icon">
      {{ item.icon }}
    </span>
    {{ t(item.nameKey) }}
  </router-link>

  <button v-else type="button" :class="rowClass" @click="emit('select', item)">
    <span class="material-symbols-outlined shrink-0 text-lg" :data-icon="item.icon">
      {{ item.icon }}
    </span>
    {{ t(item.nameKey) }}
  </button>
</template>
