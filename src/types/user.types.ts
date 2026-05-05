export interface StaffMember {
  id: number
  name: string
  email: string
  role: string | null
  roleId: number | null
  phone: string | null
  address: string | null
  imageUrl: string | null
  isActive: boolean
  employeeId: string | null
  createdAt: string
}

export interface Role {
  id: number
  name: string
}
