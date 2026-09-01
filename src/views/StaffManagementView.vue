<script setup lang="ts">
import { computed } from 'vue'
import { Users, Eye, Pencil, Trash2, UserRoundX } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { ROLES } from '@/constants/roles'
import { useStaffManagement } from '@/composables/useStaffManagement'
import { AppSelect } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import type { DataTableHeader } from '@/types/table.types'
import type { StaffMember } from '@/types/user.types'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { AppInput } from '@/components/ui/input'
import StaffDetailModal from '@/components/staff/StaffDetailModal.vue'
import StaffFormModal from '@/components/staff/StaffFormModal.vue'
import StaffStatCard from '@/components/staff/StaffStatCard.vue'
import { getImageUrl } from '@/utils/image'
import { useAuthStore } from '@/store/useAuthStore'

const { t } = useI18n()
const authStore = useAuthStore()
const {
  isDialogOpen,
  isDetailOpen,
  isSubmitting,
  editingId,
  selectedStaff,
  searchQuery,
  roleFilter,
  errors,
  form,
  staffMembers,
  pagination,
  isLoading,
  stats,
  roles,
  handleSearch,
  changePage,
  openAddDialog,
  openEditDialog,
  openDetailDialog,
  closeDialog,
  closeDetailDialog,
  handleSubmit,
  handleDelete,
  updateField,
  handleFileChange,
} = useStaffManagement()

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/* -- Columns. Every cell is a slot, so `key` is only a column identity. ----- */
const staffHeaders = computed<DataTableHeader<StaffMember>[]>(() => [
  { key: 'name', header: t('staff.table.staffMember'), minWidth: '240px' },
  { key: 'role', header: t('staff.table.role'), align: 'center', width: '150px' },
  { key: 'contact', header: t('staff.table.contact'), minWidth: '220px' },
  { key: 'isActive', header: t('staff.table.status'), width: '150px' },
  { key: 'actions', header: t('staff.table.actions'), align: 'right', width: '150px' },
])

const staffSummary = (range: { from: number; to: number; total: number }) =>
  t('staff.pagination', { start: range.from, end: range.to, total: range.total })

const getRoleBadgeClass = (role: string | null) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'bg-[#FEF3C7] text-[#92400E]'
    case ROLES.MANAGER:
      return 'bg-[#E0F2FE] text-[#0369A1]'
    case ROLES.CASHIER:
      return 'bg-[#F0FDF4] text-[#15803D]'
    default:
      return 'bg-[#F3F4F6] text-[#374151]'
  }
}
</script>

<template>
  <div class="flex h-full flex-col bg-[#F9FAFB] dark:bg-stone-900 font-body overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-10 py-10">
      <div class="w-full space-y-8">
        <!-- Stats Cards Row -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StaffStatCard
            class="h-[90px]"
            :label="t('staff.totalWorkforce')"
            :value="stats.total"
            :icon="Users"
            bg-color-class="bg-[#FDF2F0]"
            icon-color-class="text-[#E26D5C]"
          />
          <StaffStatCard
            class="h-[90px]"
            :label="t('staff.activeMembers')"
            :value="stats.active"
            :icon="null"
            bg-color-class="bg-[#F0FDF4]"
            icon-color-class="bg-[#22C55E]"
            is-dot
          />
          <StaffStatCard
            class="h-[90px]"
            :label="t('staff.inactiveMembers')"
            :value="stats.inactive"
            :icon="UserRoundX"
            bg-color-class="bg-[#F8FAFC]"
            icon-color-class="text-slate-400"
          />
        </div>

        <!-- Main Card -->
        <Card
          class="gap-0 overflow-hidden border border-transparent dark:border-stone-800 shadow-sm rounded-2xl bg-white dark:bg-stone-900/50 backdrop-blur-sm p-0"
        >
          <!-- Filter -->
          <FilterPanel
            :show-apply="false"
            :show-clear="false"
            :add-label="t('staff.addStaff')"
            actions-class="col-span-3 lg:col-span-2"
            @submit="handleSearch"
            @add="openAddDialog"
          >
            <div class="col-span-9 lg:col-span-10">
              <div class="grid grid-cols-12 gap-4 sm:items-end">
                <AppInput
                  id="staff-filter-search"
                  v-model="searchQuery"
                  search-icon
                  type="text"
                  :label="t('common.search')"
                  label-class="text-xs font-semibold uppercase tracking-wide text-[#1A1C1C]/50 dark:text-stone-400"
                  container-class="col-span-6 lg:col-span-4"
                  :placeholder="t('staff.searchPlaceholder')"
                  class="h-10 border-none bg-[#FAFAFA] pr-4 text-sm text-[#1A1C1C] shadow-none placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-primary dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
                  @update:model-value="handleSearch"
                />

                <app-select
                  v-model="roleFilter"
                  :options="roles.map(r => ({ value: r.id, label: r.name }))"
                  :label="t('staff.table.role')"
                  :all-option-label="t('staff.allRoles')"
                  class="w-full col-span-4 lg:col-span-2"
                />
              </div>
            </div>
          </FilterPanel>

          <!-- Table -->
          <DataTable
            :headers="staffHeaders"
            :data="staffMembers"
            :total-count="pagination.total"
            :loading="isLoading"
            :pagination="{
              page: pagination.page,
              pageSize: pagination.limit,
              showPageSizeSelector: false,
            }"
            :summary-formatter="staffSummary"
            :empty-title="t('staff.noStaffFound')"
            :empty-description="''"
            :caption="t('staff.table.staffMember')"
            row-key="id"
            min-width="900px"
            max-height="none"
            class="rounded-none border-0 shadow-none"
            @page-change="changePage"
          >
            <!-- Staff member -->
            <template #[`cell:name`]="{ row }">
              <div class="flex items-center gap-4">
                <div
                  class="size-10 shrink-0 overflow-hidden rounded-full border border-slate-50 shadow-sm dark:border-stone-800"
                >
                  <img
                    v-if="row.imageUrl"
                    :src="getImageUrl(row.imageUrl)"
                    class="size-full object-cover"
                  />
                  <div
                    v-else
                    class="flex size-full items-center justify-center bg-[#F3F4F6] text-xs font-bold text-[#A3A3A3] dark:bg-stone-800"
                  >
                    {{ getInitials(row.name) }}
                  </div>
                </div>
                <div>
                  <p class="text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                    {{ row.name }}
                  </p>
                  <p class="mt-0.5 text-[11px] font-bold text-[#737373] dark:text-stone-400">
                    {{ t('staff.employeeId') }}: {{ row.employeeId }}
                  </p>
                </div>
              </div>
            </template>

            <!-- Role -->
            <template #[`cell:role`]="{ row }">
              <span
                class="inline-flex rounded-full px-4 py-1 text-[11px] font-bold"
                :class="getRoleBadgeClass(row.role)"
              >
                {{ row.role }}
              </span>
            </template>

            <!-- Contact -->
            <template #[`cell:contact`]="{ row }">
              <div class="text-[13px]">
                <p class="font-bold text-[#1A1C1C] dark:text-stone-100">{{ row.email }}</p>
                <p class="font-bold text-[#737373] dark:text-stone-400">
                  {{ row.phone || t('common.na') }}
                </p>
              </div>
            </template>

            <!-- Status -->
            <template #[`cell:isActive`]="{ row }">
              <div class="flex items-center gap-2.5">
                <div
                  class="size-2 rounded-full"
                  :class="row.isActive ? 'bg-[#22C55E]' : 'bg-slate-300 dark:bg-stone-600'"
                ></div>
                <span
                  class="text-[13px] font-bold"
                  :class="
                    row.isActive
                      ? 'text-[#1A1C1C] dark:text-stone-100'
                      : 'text-[#A3A3A3] dark:text-stone-500'
                  "
                >
                  {{ row.isActive ? t('staff.table.active') : t('staff.table.notActive') }}
                </span>
              </div>
            </template>

            <!-- Actions -->
            <template #[`cell:actions`]="{ row }">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 text-[#22C55E] hover:bg-[#22C55E]/10 dark:hover:bg-[#22C55E]/20"
                  @click="openDetailDialog(row)"
                >
                  <Eye class="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-stone-800"
                  @click="openEditDialog(row)"
                >
                  <Pencil class="size-5" />
                </Button>
                <Button
                  v-if="row.id !== authStore.user?.user_id"
                  variant="ghost"
                  size="icon"
                  class="size-8 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  @click="handleDelete(row.id)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </template>
          </DataTable>
        </Card>
      </div>
    </div>

    <!-- Extracted Modals -->
    <StaffDetailModal
      :is-open="isDetailOpen"
      :staff="selectedStaff"
      :get-initials="getInitials"
      @close="closeDetailDialog"
      @edit="
        member => {
          openEditDialog(member)
          closeDetailDialog()
        }
      "
      @delete="handleDelete"
    />

    <StaffFormModal
      :is-open="isDialogOpen"
      :editing-id="editingId"
      :form="form"
      :errors="errors"
      :roles="roles"
      :is-submitting="isSubmitting"
      @close="closeDialog"
      @submit="handleSubmit"
      @update:field="({ field, value }) => updateField(field, value)"
      @file-change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-leave-active {
  transition: all 0.2s ease-in;
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(5px);
}

table {
  border-spacing: 0;
}

th {
  z-index: 1;
}
</style>
