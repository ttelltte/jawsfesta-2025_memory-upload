const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface DeleteRequestPayload {
  photoId: string
  deleteReason?: string
}

export interface DeleteRequestResponse {
  success: boolean
  message: string
}

export const sendDeleteRequest = async (
  payload: DeleteRequestPayload
): Promise<DeleteRequestResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/delete-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `削除リクエストの送信に失敗しました (${response.status})`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('削除リクエストの送信中にエラーが発生しました')
  }
}
