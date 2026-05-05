export const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }

  // Ensure the base URL doesn't have a trailing slash if the url has a leading slash
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const cleanUrl = url.startsWith('/') ? url : `/${url}`

  return `${cleanBaseUrl}${cleanUrl}`
}
