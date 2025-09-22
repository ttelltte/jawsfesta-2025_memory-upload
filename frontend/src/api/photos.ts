// 画像一覧取得API
import { normalizeError, ERROR_CODES, getErrorCodeFromStatus, logError } from '../utils/errorHandler'

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
    details?: any
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * 画像一覧を取得する
 */
export const fetchPhotos = async (retryCount = 0): Promise<PhotosResponse> => {
  const maxRetries = 3
  
  try {
    // ネットワーク接続チェック
    if (!navigator.onLine) {
      return {
        success: false,
        photos: [],
        error: {
          code: ERROR_CODES.NETWORK_ERROR,
          message: 'インターネット接続がありません。接続を確認してから再試行してください。'
        }
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒でタイムアウト

    const response = await fetch(`${API_BASE_URL}/api/photos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorCode = getErrorCodeFromStatus(response.status)
      let errorMessage: string
      let errorDetails: any

      try {
        const errorData = await response.json()
        errorMessage = errorData.error?.message || getErrorMessageFromStatus(response.status)
        errorDetails = errorData.error?.details
      } catch {
        errorMessage = getErrorMessageFromStatus(response.status)
      }

      const error = {
        code: errorCode,
        message: errorMessage,
        details: errorDetails
      }

      logError(normalizeError(error), 'fetchPhotos')

      return {
        success: false,
        photos: [],
        error
      }
    }

    const data = await response.json()
    
    // レスポンスデータの検証
    if (!data || typeof data !== 'object') {
      throw new Error('無効なレスポンス形式です')
    }

    // 成功レスポンスの場合
    if (data.success) {
      // バックエンドのレスポンス形式に対応
      const photos = data.data?.photos || data.photos || []
      if (Array.isArray(photos)) {
        return {
          success: true,
          photos: photos.map(validatePhoto).filter(Boolean) as Photo[]
        }
      }
    }

    // エラーレスポンスの場合
    return {
      success: false,
      photos: [],
      error: {
        code: data.error?.code || ERROR_CODES.FETCH_ERROR,
        message: data.error?.message || '画像一覧の取得に失敗しました',
        details: data.error?.details
      }
    }

  } catch (error) {
    const normalizedError = normalizeError(error)
    logError(normalizedError, 'fetchPhotos')

    // AbortError（タイムアウト）の場合
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        photos: [],
        error: {
          code: ERROR_CODES.TIMEOUT_ERROR,
          message: '画像一覧の取得がタイムアウトしました。再試行してください。'
        }
      }
    }

    // ネットワークエラーの場合、リトライを試行
    if (normalizedError.code === ERROR_CODES.NETWORK_ERROR && retryCount < maxRetries) {
      console.log(`画像取得をリトライします (${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 指数バックオフ
      return fetchPhotos(retryCount + 1)
    }

    return {
      success: false,
      photos: [],
      error: {
        code: normalizedError.code,
        message: normalizedError.message || '画像一覧の取得に失敗しました。しばらく待ってから再試行してください。',
        details: normalizedError.details
      }
    }
  }
}

/**
 * HTTPステータスコードからエラーメッセージを取得
 */
const getErrorMessageFromStatus = (status: number): string => {
  switch (status) {
    case 404:
      return '画像データが見つかりません。'
    case 500:
      return 'サーバー内部エラーが発生しました。'
    case 502:
      return 'サーバーが一時的に利用できません。'
    case 503:
      return 'サービスが一時的に利用できません。'
    case 504:
      return 'サーバーの応答がタイムアウトしました。'
    default:
      if (status >= 500) {
        return 'サーバーエラーが発生しました。しばらく待ってから再試行してください。'
      }
      if (status >= 400) {
        return 'リクエストエラーが発生しました。'
      }
      return `予期しないエラーが発生しました (${status})`
  }
}

/**
 * 写真データの検証
 */
const validatePhoto = (photo: any): Photo | null => {
  if (!photo || typeof photo !== 'object') {
    return null
  }

  // 必須フィールドの検証
  if (!photo.id || !photo.s3Key || !photo.uploadTime || typeof photo.uploadTimeUnix !== 'number') {
    console.warn('無効な写真データ:', photo)
    return null
  }

  return {
    id: String(photo.id),
    s3Key: String(photo.s3Key),
    uploaderName: String(photo.uploaderName || 'Anonymous'),
    comment: String(photo.comment || ''),
    uploadTime: String(photo.uploadTime),
    uploadTimeUnix: Number(photo.uploadTimeUnix),
    presignedUrl: photo.presignedUrl ? String(photo.presignedUrl) : undefined
  }
}

/**
 * 画像の読み込み状態を管理するためのヘルパー
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = url
  })
}