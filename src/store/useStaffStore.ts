import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStaffList, createStaff, updateStaff, deleteStaff as deleteStaffApi } from '@/api/user'
import { getRoles } from '@/api/role'
import type { StaffMember, Role } from '@/types/user.types'
import type { CreateStaffInput } from '@/types/staff.types'

export const useStaffStore = defineStore('staff', () => {
  // State
  const staffList = ref<StaffMember[]>([])
  const roles = ref<Role[]>([])
  const isLoading = ref(false)
  const isRolesLoading = ref(false)
  const lastError = ref<string | null>(null)

  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  // Getters
  const activeStaffCount = computed(() => staffList.value.filter(s => s.isActive).length)
  const inactiveStaffCount = computed(() => staffList.value.length - activeStaffCount.value)

  // Actions
  const fetchStaff = async (
    page: number = 1,
    limit: number = 10,
    search: string = '',
    signal?: AbortSignal
  ) => {
    isLoading.value = true
    lastError.value = null
    try {
      const result = await getStaffList(page, limit, search, signal)
      staffList.value = result.data
      pagination.value = result.pagination
    } catch (err: unknown) {
      // Aborted because a newer live-search request superseded this one; the
      // newer request now owns loading/error state, so bail without touching it.
      if (signal?.aborted) return
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch staff'
      throw err
    } finally {
      if (!signal?.aborted) {
        isLoading.value = false
      }
    }
  }

  const fetchRoles = async () => {
    isRolesLoading.value = true
    lastError.value = null
    try {
      roles.value = await getRoles()
    } catch (err: unknown) {
      const error = err as Error
      lastError.value = error.message || 'Failed to fetch roles'
      throw err
    } finally {
      isRolesLoading.value = false
    }
  }

  const addStaff = async (payload: CreateStaffInput) => {
    lastError.value = null
    try {
      await createStaff(payload)
      await fetchStaff(pagination.value.page, pagination.value.limit)
    } catch (err: unknown) {
      const error = err as Error
      lastError.value = error.message || 'Failed to add staff'
      throw err
    }
  }

  const editStaff = async (id: number, payload: Partial<CreateStaffInput>) => {
    lastError.value = null
    try {
      await updateStaff(id, payload)
      await fetchStaff(pagination.value.page, pagination.value.limit)
    } catch (err: unknown) {
      const error = err as Error
      lastError.value = error.message || 'Failed to update staff'
      throw err
    }
  }

  const removeStaff = async (id: number) => {
    lastError.value = null
    try {
      await deleteStaffApi(id)
      await fetchStaff(pagination.value.page, pagination.value.limit)

      if (staffList.value.length === 0 && pagination.value.page > 1) {
        await fetchStaff(pagination.value.page - 1, pagination.value.limit)
      }
    } catch (err: unknown) {
      const error = err as Error
      lastError.value = error.message || 'Failed to remove staff'
      throw err
    }
  }

  return {
    staffList,
    roles,
    isLoading,
    isRolesLoading,
    pagination,
    lastError,
    activeStaffCount,
    inactiveStaffCount,
    fetchStaff,
    fetchRoles,
    addStaff,
    editStaff,
    removeStaff,
  }
})
