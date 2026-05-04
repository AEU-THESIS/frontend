import api from './api'

export const uploadApi = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)

    // We use multipart/form-data here
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    // @ts-expect-error - The interceptor already returns response.data
    return response.data.url
  },
  deleteImage: async (imageUrl: string): Promise<void> => {
    await api.delete('/api/upload', {
      data: { imageUrl },
    })
  },
}
