import http from './api'
import type { LoginInput } from '@/validations/authValidation'
import type { AuthResponse } from '@/types/auth.types'

export const login = async (payload: LoginInput): Promise<AuthResponse> => {
  const res = await http.post<AuthResponse>('/api/auth/login', payload)
  return res.data
}
