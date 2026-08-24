import http from './api'
import type { LoginInput } from '@/validations/authValidation'
import type { ForgotPasswordInput, ResetPasswordInput } from '@/validations/resetPasswordValidation'
import type { AuthResponse } from '@/types/auth.types'

export const login = async (payload: LoginInput): Promise<AuthResponse> => {
  const res = await http.post<AuthResponse>('/api/auth/sessions', payload)
  return res.data
}

export const logout = async (): Promise<void> => {
  await http.delete('/api/auth/sessions')
}

export const forgotPassword = async (payload: ForgotPasswordInput): Promise<void> => {
  await http.post('/api/auth/password-resets', { email: payload.email })
}

export const resetPassword = async (token: string, payload: ResetPasswordInput): Promise<void> => {
  await http.put(`/api/auth/password-resets/${token}`, { newPassword: payload.newPassword })
}
