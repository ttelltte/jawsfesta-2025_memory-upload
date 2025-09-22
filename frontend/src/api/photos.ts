// 画像一覧取得API
export interface Photo {
  id: string
  s3Key: string
  uploaderName: string
  comment: string
  uploadTime: string
  uploadTimeUnix: number
  presignedUrl?: string
}

export interface PhotosResponse {
  success: boolean
  photos: Photo[]
  error?: {
    code: string
    message: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const fetchPhotos = async (): Promise<PhotosResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/photos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('画像一覧の取得に失敗しました:', error)
    return {
      success: false,
      photos: [],
      error: {
        code: 'FETCH_ERROR',
        message: '画像一覧の取得に失敗しました。しばらく待ってから再試行してください。'
      }
    }
  }
}