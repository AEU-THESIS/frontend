import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZodError } from 'zod'
import { toast } from 'vue-sonner'
import { useStaffStore } from '@/store/useStaffStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createStaffSchema } from '@/validations/staffValidation'
import type { StaffMember } from '@/types/user.types'
import type { CreateStaffInput } from '@/types/staff.types'
import { uploadApi } from '@/api/upload'
import type { ApiError } from '@/types/api.types'

export function useStaffManagement() {
  const { t } = useI18n()
  const staffStore = useStaffStore()
  const authStore = useAuthStore()

  // --- State ---
  const isDialogOpen = ref(false)
  const isDetailOpen = ref(false)
  const isSubmitting = ref(false)
  const editingId = ref<number | null>(null)
  const selectedStaff = ref<StaffMember | null>(null)
  const searchQuery = ref('')
  const roleFilter = ref<string | number>('all')
  const errors = ref<Record<string, string>>({})
  const selectedImageFile = ref<File | null>(null)

  const form = reactive<CreateStaffInput>({
    name: '',
    email: '',
    roleId: 0,
    phone: '',
    address: '',
    imageUrl: '',
    isActive: true,
  })

  // --- Computed ---
  const staffMembers = computed(() => {
    let list = staffStore.staffList
    if (roleFilter.value && roleFilter.value !== 'all') {
      const roleId =
        typeof roleFilter.value === 'string' ? Number(roleFilter.value) : roleFilter.value
      list = list.filter(m => m.roleId === roleId)
    }
    return list
  })
  const pagination = computed(() => staffStore.pagination)
  const isLoading = computed(() => staffStore.isLoading)

  const stats = computed(() => ({
    total: staffStore.pagination.total,
    active: staffStore.activeStaffCount,
    inactive: staffStore.inactiveStaffCount,
  }))

  // --- Methods ---
  const fetchStaff = (page = 1) => {
    staffStore.fetchStaff(page, staffStore.pagination.limit, searchQuery.value)
  }

  const handleSearch = () => {
    fetchStaff(1)
  }

  const changePage = (page: number) => {
    fetchStaff(page)
  }

  const resetForm = () => {
    Object.assign(form, {
      name: '',
      email: '',
      roleId: 0,
      phone: '',
      address: '',
      imageUrl: '',
      isActive: true,
    })
    errors.value = {}
    editingId.value = null
    selectedImageFile.value = null
  }

  const openAddDialog = () => {
    resetForm()
    isDialogOpen.value = true
  }

  const openEditDialog = (member: StaffMember) => {
    resetForm()
    editingId.value = member.id
    Object.assign(form, {
      name: member.name,
      email: member.email,
      roleId: member.roleId || 0,
      phone: member.phone || '',
      address: member.address || '',
      imageUrl: member.imageUrl || '',
      isActive: member.isActive,
    })
    isDialogOpen.value = true
  }

  const openDetailDialog = (member: StaffMember) => {
    selectedStaff.value = member
    isDetailOpen.value = true
  }

  const closeDialog = () => {
    isDialogOpen.value = false
    resetForm()
  }

  const closeDetailDialog = () => {
    isDetailOpen.value = false
    selectedStaff.value = null
  }

  const handleSubmit = async () => {
    errors.value = {}

    try {
      createStaffSchema.parse(form)
    } catch (err) {
      if (err instanceof ZodError) {
        err.issues.forEach(e => {
          if (e.path[0]) errors.value[e.path[0].toString()] = e.message
        })
        return
      }
    }

    let newlyUploadedImage = false
    let uploadedImageUrl = form.imageUrl

    try {
      isSubmitting.value = true

      if (selectedImageFile.value) {
        uploadedImageUrl = await uploadApi.uploadImage(selectedImageFile.value)
        newlyUploadedImage = true
      }

      const submitData = { ...form, imageUrl: uploadedImageUrl }

      if (editingId.value) {
        await staffStore.editStaff(editingId.value, submitData)
        toast.success(t('staff.updateSuccess'))
      } else {
        await staffStore.addStaff(submitData)
        toast.success(t('staff.createSuccess'))
      }
      closeDialog()
    } catch (err: unknown) {
      // Rollback orphaned image if staff creation/update failed
      if (newlyUploadedImage && uploadedImageUrl) {
        try {
          await uploadApi.deleteImage(uploadedImageUrl)
        } catch (rollbackErr) {
          console.error('Failed to rollback orphaned image:', rollbackErr)
        }
      }

      const error = err as ApiError
      const message = error.response?.data?.message || error.message || t('staff.error')
      toast.error(message)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleDelete = async (id: number) => {
    if (authStore.user?.user_id === id) {
      toast.error(t('staff.deleteSelfError'))
      return
    }

    if (!confirm(t('staff.deleteConfirm'))) return

    try {
      await staffStore.removeStaff(id)
      toast.success(t('staff.deleteSuccess'))
      if (isDetailOpen.value) closeDetailDialog()
    } catch {
      toast.error(t('staff.deleteFailed'))
    }
  }

  const updateField = (field: keyof CreateStaffInput, value: string | number | boolean | null) => {
    Object.assign(form, { [field]: value })
  }

  const handleFileChange = (file: File | null) => {
    selectedImageFile.value = file
  }

  onMounted(async () => {
    await Promise.all([staffStore.fetchStaff(1, 10), staffStore.fetchRoles()])
  })

  return {
    // State
    isDialogOpen,
    isDetailOpen,
    isSubmitting,
    editingId,
    selectedStaff,
    searchQuery,
    roleFilter,
    errors,
    form,
    // Computed
    staffMembers,
    pagination,
    isLoading,
    stats,
    roles: computed(() => staffStore.roles),
    // Methods
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
  }
}
