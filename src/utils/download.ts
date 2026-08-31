// Hands a downloaded blob to the browser as a file save.

/**
 * Triggers a save dialog for `blob` under `fileName`. The object URL is revoked
 * straight after the click so the blob isn't pinned in memory.
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
