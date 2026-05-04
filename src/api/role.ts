import http from './api'
import type { Role } from '@/types/user.types'

export const getRoles = async (): Promise<Role[]> => {
  const res = await http.get<Role[]>('/api/roles')
  return res.data
}
