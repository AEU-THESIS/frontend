import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, logout as logoutApi } from '@/api/auth'
import type { LoginInput } from '@/validations/authValidation'
import type { User } from '@/types/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const isSessionTerminated = ref(false)

  const user = ref<User | null>(null)

  // Use localStorage to maintain session dynamically after page reloads
  const initializeFromStorage = () => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) token.value = storedToken
  }
  initializeFromStorage()

  const isAuthenticated = () => !!token.value
  const getAccessToken = () => token.value

  const loginAction = async (credentials: LoginInput) => {
    const response = await login(credentials)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
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
