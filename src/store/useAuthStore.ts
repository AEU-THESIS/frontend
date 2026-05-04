import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, logout as logoutApi } from '@/api/auth'
import { UserSchema } from '@/validations/authValidation'
import type { LoginInput } from '@/validations/authValidation'
import type { User } from '@/types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const isSessionTerminated = ref(false)

  const user = ref<User | null>(null)

  // Use localStorage to maintain session dynamically after page reloads
  const initializeFromStorage = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken) token.value = storedToken
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        const validated = UserSchema.safeParse(parsed)
        if (validated.success) {
          user.value = validated.data
        } else {
          console.error('Invalid user data in localStorage', validated.error)
          localStorage.removeItem('user')
          user.value = null
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage', e)
        localStorage.removeItem('user')
        user.value = null
      }
    }
  }
  initializeFromStorage()

  const isAuthenticated = () => !!token.value
  const getAccessToken = () => token.value

  const loginAction = async (credentials: LoginInput) => {
    const response = await login(credentials)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)

    // Store only minimal non-PII fields
    const minimalUser = {
      user_id: response.user.user_id,
      shop_id: response.user.shop_id,
      role: response.user.role,
    }
    localStorage.setItem('user', JSON.stringify(minimalUser))
  }

  const logout = async (isTokenExpired: boolean = false) => {
    // Best-effort: notify backend to blacklist the token
    // Still clear client state even if the API call fails
    try {
      if (token.value) {
        await logoutApi()
      }
    } catch {
      // Silently ignore — client-side cleanup still happens below
    }

    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (isTokenExpired) {
      isSessionTerminated.value = true
    }
  }

  const clearSessionTerminated = () => {
    isSessionTerminated.value = false
  }

  return {
    token,
    user,
    isSessionTerminated,
    isAuthenticated,
    getAccessToken,
    loginAction,
    logout,
    clearSessionTerminated,
  }
})
