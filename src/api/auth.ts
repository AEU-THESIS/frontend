import http from './api'
import type { LoginInput } from '@/validations/authValidation'
import type { AuthResponse, ApiResponse } from '@/types/auth.types'

export const login = async (payload: LoginInput): Promise<AuthResponse> => {
  const res = await http.post<ApiResponse<AuthResponse>>('/api/auth/login', payload)
  const typedRes = res as unknown as ApiResponse<AuthResponse>
  return typedRes.data
}
