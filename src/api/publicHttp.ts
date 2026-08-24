import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/auth.types'

/**
 * Axios instance for the public Telegram Mini App routes. Unlike the staff `http`
 * instance it does NOT attach a JWT and does NOT redirect to the login page on
 * error — the customer has no account. Instead every request carries the Telegram
 * `initData` so the backend can verify the guest.
 *
 * Local dev fallback: outside Telegram (no initData) in a dev build, it sends an
 * unsigned `X-Dev-Telegram-User` header, which the backend accepts only when
 * `TELEGRAM_ALLOW_DEV_INITDATA=true` (never in production).
 */
export interface PublicHttpInstance extends Omit<
  AxiosInstance,
  'get' | 'post' | 'put' | 'delete' | 'patch'
> {
  get<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  post<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  put<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
  delete<T = unknown, R = ApiResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>
}

const DEV_TELEGRAM_USER = { id: 999999, username: 'dev_customer', first_name: 'Dev' }

const apiBase = import.meta.env.VITE_API_URL || ''
const baseURL = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase

const publicHttp = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
}) as PublicHttpInstance

publicHttp.interceptors.request.use(config => {
  const initData = window.Telegram?.WebApp?.initData
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData
  } else if (import.meta.env.DEV) {
    // Dev only — the backend ignores this unless TELEGRAM_ALLOW_DEV_INITDATA=true.
    config.headers['X-Dev-Telegram-User'] = JSON.stringify(DEV_TELEGRAM_USER)
  }
  return config
})

publicHttp.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
)

export default publicHttp
