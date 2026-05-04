import http from './api'
import type { StaffMember } from '@/types/user.types'
import { createStaffSchema } from '@/validations/staffValidation'
import type { CreateStaffInput } from '@/types/staff.types'

export interface PaginatedStaff {
  data: StaffMember[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const getStaffList = async (
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<PaginatedStaff> => {
  const res = await http.get<PaginatedStaff>('/api/users', {
    params: { page, limit, search },
  })
  return res.data
}

export const createStaff = async (payload: CreateStaffInput): Promise<StaffMember> => {
  const parsedPayload = createStaffSchema.parse(payload)
  const res = await http.post<StaffMember>('/api/users', parsedPayload)
  return res.data
}

export const updateStaff = async (
  id: number,
  payload: Partial<CreateStaffInput>
): Promise<StaffMember> => {
  const parsedPayload = createStaffSchema.partial().parse(payload)
  const res = await http.put<StaffMember>(`/api/users/${id}`, parsedPayload)
  return res.data
}

export const deleteStaff = async (id: number): Promise<void> => {
  await http.delete(`/api/users/${id}`)
}
