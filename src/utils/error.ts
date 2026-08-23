// Error message helpers for API failures.

/**
 * The server's `message` for a failed request, or `fallback` when the error
 * carries none (network failure, non-Axios throw, unexpected shape).
 */
export const getErrorMessage = (err: unknown, fallback: string) => {
  const axiosErr = err as { response?: { data?: { message?: string } } }
  return axiosErr?.response?.data?.message || fallback
}
