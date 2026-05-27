<script setup lang="ts">
import {
  Users,
  LoaderCircle,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserRoundX,
  Plus,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { ROLES } from '@/constants/roles'
import { useStaffManagement } from '@/composables/useStaffManagement'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
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
      <div class="mx-auto w-full max-w-[1400px] space-y-8">
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
          class="overflow-hidden border border-transparent dark:border-stone-800 shadow-sm rounded-2xl bg-white dark:bg-stone-900/50 backdrop-blur-sm"
        >
          <!-- Toolbar -->
          <div class="p-8 flex flex-col gap-6 md:flex-row md:items-center justify-between">
            <div class="flex flex-col md:flex-row items-center gap-8 flex-1">
              <!-- Search -->
              <div class="relative w-full max-w-sm">
                <Search class="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
                <Input
                  v-model="searchQuery"
                  :placeholder="t('staff.searchPlaceholder')"
                  class="h-12 rounded-xl border-none bg-[#FAFAFA] dark:bg-stone-800/50 pl-11 pr-4 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-[#A3A3A3] text-stone-800 dark:text-stone-100"
                  @input="handleSearch"
                />
              </div>

              <!-- Filter -->
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider"
                  >{{ t('common.search') }}:</span
                >
                <div class="relative min-w-[140px]">
                  <Select v-model="roleFilter">
                    <SelectTrigger
                      class="h-12 w-full border-none bg-[#FAFAFA] dark:bg-stone-800/50 px-5 text-sm font-bold text-[#1A1C1C] dark:text-stone-100 focus:ring-0"
                    >
                      <SelectValue :placeholder="t('staff.allRoles')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{{ t('staff.allRoles') }}</SelectItem>
                      <SelectItem v-for="role in roles" :key="role.id" :value="role.name">
                        {{ role.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <!-- Add Button -->
            <Button
              class="h-12 gap-2 rounded-xl bg-[#D2691E] hover:bg-[#B35919] px-8 font-bold text-white shadow-none transition-all"
              @click="openAddDialog"
            >
              <Plus class="size-5" />
              {{ t('staff.addStaff') }}
            </Button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr
                  class="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3] border-b border-slate-50 dark:border-stone-800"
                >
                  <th class="px-8 py-4 font-bold">{{ t('staff.table.staffMember') }}</th>
                  <th class="px-8 py-4 font-bold text-center">{{ t('staff.table.role') }}</th>
                  <th class="px-8 py-4 font-bold">{{ t('staff.table.contact') }}</th>
                  <th class="px-8 py-4 font-bold">{{ t('staff.table.status') }}</th>
                  <th class="px-8 py-4 font-bold text-right">{{ t('staff.table.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 dark:divide-stone-800">
                <tr v-if="isLoading">
                  <td colspan="5" class="px-8 py-20 text-center text-slate-400">
                    <LoaderCircle class="size-8 animate-spin mx-auto mb-2 text-primary/40" />
                    <p class="text-xs font-bold uppercase tracking-widest">
                      {{ t('staff.loadingEmployees') }}
                    </p>
                  </td>
                </tr>

                <tr v-else-if="staffMembers.length === 0">
                  <td colspan="5" class="px-8 py-20 text-center text-slate-300">
                    <p class="text-sm font-bold">{{ t('staff.noStaffFound') }}</p>
                  </td>
                </tr>

                <tr
                  v-for="member in staffMembers"
                  :key="member.id"
                  class="group hover:bg-slate-50/50 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                      <div
                        class="size-10 overflow-hidden rounded-full shadow-sm shrink-0 border border-slate-50 dark:border-stone-800"
                      >
                        <img
                          v-if="member.imageUrl"
                          :src="getImageUrl(member.imageUrl)"
                          class="size-full object-cover"
                        />
                        <div
                          v-else
                          class="flex size-full items-center justify-center bg-[#F3F4F6] dark:bg-stone-800 text-[#A3A3A3] text-xs font-bold"
                        >
                          {{ getInitials(member.name) }}
                        </div>
                      </div>
                      <div>
                        <p class="text-[14px] font-bold text-[#1A1C1C] dark:text-stone-100">
                          {{ member.name }}
                        </p>
                        <p class="text-[11px] font-bold text-[#737373] dark:text-stone-400 mt-0.5">
                          {{ t('staff.employeeId') }}: {{ member.employeeId }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-center">
                    <span
                      class="inline-flex rounded-full px-4 py-1 text-[11px] font-bold"
                      :class="getRoleBadgeClass(member.role)"
                    >
                      {{ member.role }}
                    </span>
                  </td>
                  <td class="px-8 py-5">
                    <div class="text-[13px]">
                      <p class="font-bold text-[#1A1C1C] dark:text-stone-100">{{ member.email }}</p>
                      <p class="font-bold text-[#737373] dark:text-stone-400">
                        {{ member.phone || t('common.na') }}
                      </p>
                    </div>
                  </td>
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-2.5">
                      <div
                        class="size-2 rounded-full"
                        :class="member.isActive ? 'bg-[#22C55E]' : 'bg-slate-300 dark:bg-stone-600'"
                      ></div>
                      <span
                        class="text-[13px] font-bold"
                        :class="
                          member.isActive
                            ? 'text-[#1A1C1C] dark:text-stone-100'
                            : 'text-[#A3A3A3] dark:text-stone-500'
                        "
                      >
                        {{ member.isActive ? t('staff.table.active') : t('staff.table.notActive') }}
                      </span>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-[#22C55E] hover:bg-[#22C55E]/10 dark:hover:bg-[#22C55E]/20"
                        @click="openDetailDialog(member)"
                      >
                        <Eye class="size-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-stone-800"
                        @click="openEditDialog(member)"
                      >
                        <Pencil class="size-5" />
                      </Button>
                      <Button
                        v-if="member.id !== authStore.user?.user_id"
                        variant="ghost"
                        size="icon"
                        class="size-8 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        @click="handleDelete(member.id)"
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            class="p-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-50 dark:border-stone-800 gap-4"
          >
            <p class="text-sm font-bold text-slate-400">
              {{
                t('staff.pagination', {
                  start: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1,
                  end: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })
              }}
            </p>

            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                class="size-10 border-slate-100 dark:border-stone-700 text-slate-400 dark:text-stone-400 bg-white dark:bg-stone-800 hover:bg-slate-50 dark:hover:bg-stone-700"
                :disabled="pagination.page === 1"
                @click="changePage(pagination.page - 1)"
              >
                <ChevronLeft class="size-5" />
              </Button>

              <div class="flex items-center gap-2">
                <Button
                  v-for="p in pagination.totalPages"
                  :key="p"
                  :variant="pagination.page === p ? 'default' : 'outline'"
                  class="size-10 rounded-lg font-bold transition-all"
                  :class="
                    pagination.page === p
                      ? 'bg-[#D2691E] text-white hover:bg-[#B35919]'
                      : 'bg-white dark:bg-stone-800 text-[#737373] dark:text-stone-300 border-[#EEEEEE] dark:border-stone-700 hover:bg-slate-50 dark:hover:bg-stone-700'
                  "
                  @click="changePage(p)"
                >
                  {{ p }}
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                class="size-10 border-slate-100 dark:border-stone-700 text-slate-400 dark:text-stone-400 bg-white dark:bg-stone-800 hover:bg-slate-50 dark:hover:bg-stone-700"
                :disabled="pagination.page === pagination.totalPages"
                @click="changePage(pagination.page + 1)"
              >
                <ChevronRight class="size-5" />
              </Button>
            </div>
          </div>
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
