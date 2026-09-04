import http from './api'
import type { LoginInput } from '@/validations/authValidation'
import type { ForgotPasswordInput, ResetPasswordInput } from '@/validations/resetPasswordValidation'
import type { AuthResponse, User } from '@/types/auth.types'

export const login = async (payload: LoginInput): Promise<AuthResponse> => {
  const res = await http.post<AuthResponse>('/api/auth/sessions', payload)
  return res.data
}

// Live user record for the signed-in caller — used to refresh a changed role or
// deactivation without re-login (AT-74).
export const getMe = async (): Promise<User> => {
  const res = await http.get<User>('/api/auth/me')
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
