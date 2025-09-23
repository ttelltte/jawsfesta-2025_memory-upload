// 環境変数からAPI URLを取得
const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface UpdatePhotoRequest {
  uploaderName?: string
  comment?: string
  rotation?: number
}

export interface AdminApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// 画像削除
export const deletePhoto = async (photoId: string): Promise<AdminApiResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/admin/photos/${photoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('画像削除エラー:', error)
    return {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: '画像の削除に失敗しました'
      }
    }
  }
}

// 画像情報更新
export const updatePhoto = async (photoId: string, updates: UpdatePhotoRequest): Promise<AdminApiResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/admin/photos/${photoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('画像更新エラー:', error)
    return {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: '画像情報の更新に失敗しました'
      }
    }
  }
}