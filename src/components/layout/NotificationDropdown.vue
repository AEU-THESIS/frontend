<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useAuthStore } from '@/store/useAuthStore'
import { ROLES } from '@/constants/roles'
import { formatTimeAgo } from '@/utils/timeAgo'
import { Button } from '@/components/ui/button'
import type { NotificationItem, NotificationType } from '@/types/notification.types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t, te } = useI18n()
const router = useRouter()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

// Selection mode state for bulk deletion
const isSelectMode = ref(false)
const selectedIds = ref<number[]>([])
const showConfirmClearAll = ref(false)

// Infinite scroll sentinel & container refs
const scrollContainer = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const visibleNotifications = computed(() => {
  const userRole = authStore.user?.role
  if (userRole === ROLES.ADMIN || userRole === ROLES.MANAGER) {
    return notificationStore.notifications
  }
  return notificationStore.notifications.filter(n => {
    if (!n.data?.targetRole) return true
    return n.data.targetRole === userRole
  })
})

const isAllSelected = computed(() => {
  if (visibleNotifications.value.length === 0) return false
  return visibleNotifications.value.every(n => selectedIds.value.includes(n.id))
})

const getNotificationIcon = (type: NotificationType | string) => {
  switch (type) {
    case 'pre_order':
    case 'new_pre_order':
      return 'shopping_bag'
    case 'low_stock':
      return 'inventory_2'
    case 'out_of_stock':
      return 'error_outline'
    case 'promotion_activated':
    case 'promotion_deactivated':
      return 'campaign'
    default:
      return 'notifications'
  }
}

const getIconClass = (type: NotificationType | string) => {
  switch (type) {
    case 'pre_order':
    case 'new_pre_order':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
    case 'low_stock':
      return 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'
    case 'out_of_stock':
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
    case 'promotion_activated':
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
    case 'promotion_deactivated':
      return 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
    default:
      return 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
  }
}

const getNotificationTitle = (item: NotificationItem) => {
  if (item.type && te(`notifications.types.${item.type}`)) {
    if (item.data?.orderNumber) {
      return `${t(`notifications.types.${item.type}`)} #${item.data.orderNumber}`
    }
    if (item.data?.ingredientName) {
      return `${t(`notifications.types.${item.type}`)}: ${item.data.ingredientName}`
    }
    if (item.data?.promotionName) {
      return `${t(`notifications.types.${item.type}`)}: ${item.data.promotionName}`
    }
    return t(`notifications.types.${item.type}`)
  }
  return item.data?.title || t('notifications.defaultTitle')
}

const handleNotificationClick = async (item: NotificationItem) => {
  if (isSelectMode.value) {
    toggleSelection(item.id)
    return
  }

  if (!item.readAt) {
    await notificationStore.markAsRead(item.id)
  }
  emit('close')

  const target = item.data?.navigateTo
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    router.push(target).catch(() => {
      /* navigation aborted or route not found */
    })
  }
}

const handleMarkAllAsRead = async () => {
  await notificationStore.markAllAsRead()
}

const handleDeleteSingle = async (id: number) => {
  await notificationStore.deleteNotification(id)
}

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  selectedIds.value = []
  showConfirmClearAll.value = false
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = visibleNotifications.value.map(n => n.id)
  }
}

const toggleSelection = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const handleDeleteSelected = async () => {
  if (selectedIds.value.length === 0) return
  await notificationStore.deleteSelected([...selectedIds.value])
  selectedIds.value = []
  isSelectMode.value = false
}

const handleClearAll = async () => {
  await notificationStore.clearAll()
  showConfirmClearAll.value = false
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 60) {
    notificationStore.loadMore()
  }
}

// Setup IntersectionObserver for smooth infinite scroll
onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          notificationStore.loadMore()
        }
      },
      {
        root: scrollContainer.value,
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    if (sentinelRef.value) {
      observer.observe(sentinelRef.value)
    }
  }
})

watch(sentinelRef, el => {
  if (observer && el) {
    observer.disconnect()
    observer.observe(el)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<template>
  <div
    class="absolute right-0 mt-3 w-88 sm:w-[420px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[560px]"
  >
    <!-- Header -->
    <div
      class="px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex flex-col gap-2 shrink-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm"
    >
      <!-- Normal Header Mode -->
      <div v-if="!isSelectMode && !showConfirmClearAll" class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="font-bold text-stone-800 dark:text-stone-100 text-base">
            {{ t('notifications.title') }}
          </h3>
          <span
            v-if="notificationStore.unreadCount > 0"
            class="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400"
          >
            {{ notificationStore.unreadCount }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Mark All As Read -->
          <Button
            type="button"
            variant="ghost"
            class="h-auto p-0 text-xs font-semibold text-amber-700 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="notificationStore.unreadCount === 0"
            @click="handleMarkAllAsRead"
          >
            {{ t('notifications.markAllAsRead') }}
          </Button>

          <span class="text-stone-300 dark:text-stone-700">|</span>

          <!-- Multi-select toggle -->
          <Button
            v-if="visibleNotifications.length > 0"
            type="button"
            variant="ghost"
            class="h-auto p-0 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-transparent transition-colors"
            @click="toggleSelectMode"
          >
            {{ t('notifications.select') }}
          </Button>

          <!-- Clear All Trigger -->
          <Button
            v-if="visibleNotifications.length > 0"
            type="button"
            variant="ghost"
            size="icon"
            class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            :title="t('notifications.clearAll')"
            @click="showConfirmClearAll = true"
          >
            <span class="material-symbols-outlined text-[18px]">delete_sweep</span>
          </Button>
        </div>
      </div>

      <!-- Confirmation Header for Clear All -->
      <div
        v-else-if="showConfirmClearAll"
        class="flex items-center justify-between bg-rose-50/70 dark:bg-rose-950/40 p-2 rounded-xl"
      >
        <span class="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {{ t('notifications.confirmClearAll') }}
        </span>
        <div class="flex items-center gap-1.5">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            class="h-7 px-2.5 text-xs font-semibold rounded-lg"
            @click="handleClearAll"
          >
            {{ t('notifications.clearAll') }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
            @click="showConfirmClearAll = false"
          >
            {{ t('notifications.cancel') }}
          </Button>
        </div>
      </div>

      <!-- Multi-select Header Mode -->
      <div v-else-if="isSelectMode" class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            :checked="isAllSelected"
            @change="toggleSelectAll"
          />
          <span class="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {{ t('notifications.selectAll') }}
          </span>
        </label>

        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            :disabled="selectedIds.length === 0"
            class="h-7 px-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            @click="handleDeleteSelected"
          >
            <span class="material-symbols-outlined text-[14px]">delete</span>
            {{ t('notifications.deleteSelected', { count: selectedIds.length }) }}
          </Button>

          <Button
            type="button"
            variant="ghost"
            class="h-auto p-0 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-transparent transition-colors"
            @click="toggleSelectMode"
          >
            {{ t('notifications.cancel') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Notification List -->
    <div
      ref="scrollContainer"
      class="overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 flex-1 min-h-0"
      @scroll="handleScroll"
    >
      <!-- Loading skeleton for first fetch -->
      <div
        v-if="notificationStore.isLoading && visibleNotifications.length === 0"
        class="p-6 space-y-4"
      >
        <div v-for="i in 3" :key="i" class="flex gap-3 animate-pulse">
          <div class="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800 shrink-0"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-3.5 bg-stone-200 dark:bg-stone-800 rounded w-3/4"></div>
            <div class="h-2.5 bg-stone-200 dark:bg-stone-800 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="visibleNotifications.length === 0"
        class="py-12 px-6 flex flex-col items-center justify-center text-center"
      >
        <div
          class="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center text-stone-400 dark:text-stone-500 mb-3"
        >
          <span class="material-symbols-outlined text-[28px]">notifications_none</span>
        </div>
        <p class="text-sm font-semibold text-stone-700 dark:text-stone-300">
          {{ t('notifications.empty') }}
        </p>
        <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">
          {{ t('notifications.emptySubtitle') }}
        </p>
      </div>

      <!-- Notification Items -->
      <div
        v-for="item in visibleNotifications"
        :key="item.id"
        class="group p-3.5 sm:p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors relative flex items-start gap-3 select-none"
        :class="{ 'bg-amber-50/40 dark:bg-amber-950/15': !item.readAt }"
        @click="handleNotificationClick(item)"
      >
        <!-- Selection Checkbox (Select Mode) -->
        <div v-if="isSelectMode" class="pt-2 shrink-0" @click.stop>
          <input
            type="checkbox"
            class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            :checked="selectedIds.includes(item.id)"
            @change="toggleSelection(item.id)"
          />
        </div>

        <!-- Icon -->
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          :class="getIconClass(item.type)"
        >
          <span class="material-symbols-outlined text-[20px]">
            {{ getNotificationIcon(item.type) }}
          </span>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pr-1">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <h4
              class="text-sm font-semibold truncate"
              :class="
                !item.readAt
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-600 dark:text-stone-400'
              "
            >
              {{ getNotificationTitle(item) }}
            </h4>
            <span class="text-[11px] text-stone-400 dark:text-stone-500 shrink-0 font-medium">
              {{ formatTimeAgo(item.createdAt, t) }}
            </span>
          </div>

          <p class="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {{ item.data?.description }}
          </p>
        </div>

        <!-- Right Side: Unread Dot + Quick Single Delete Button -->
        <div class="flex items-center gap-1.5 shrink-0 pt-1">
          <!-- Unread Dot -->
          <span
            v-if="!item.readAt"
            class="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-500 block"
          ></span>

          <!-- Single Delete Button (visible on hover / focus) -->
          <Button
            v-if="!isSelectMode"
            type="button"
            variant="ghost"
            size="icon"
            class="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
            :title="t('notifications.delete')"
            @click.stop="handleDeleteSingle(item.id)"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </Button>
        </div>
      </div>

      <!-- Sentinel element for IntersectionObserver infinite scroll -->
      <div ref="sentinelRef" class="h-2 w-full"></div>

      <!-- Loading More Indicator -->
      <div
        v-if="notificationStore.isLoadingMore"
        class="py-3 text-center text-xs text-stone-400 dark:text-stone-500 flex items-center justify-center gap-2"
      >
        <span
          class="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"
        ></span>
        <span>{{ t('notifications.loadingMore') }}</span>
      </div>
    </div>
  </div>
</template>
