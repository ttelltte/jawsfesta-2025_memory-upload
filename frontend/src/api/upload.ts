// Upload API クライアント
import { normalizeError, ERROR_CODES, getErrorCodeFromStatus, logError } from '../utils/errorHandler'

export interface UploadRequest {
  file: File
  uploaderName?: string
  comment?: string
  checkedItems: Record<string, boolean>
}

export interface UploadResponse {
  success: boolean
  data?: {
    id: string
    s3Key: string
    uploadTime: string
    message: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * 画像をアップロードする
 */
export const uploadImage = async (
  request: UploadRequest,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> => {
  try {
    // FormDataを作成
    const formData = new FormData()
    formData.append('image', request.file)
    formData.append('uploaderName', request.uploaderName || 'Anonymous')
    formData.append('comment', request.comment || '')
    formData.append('checkedItems', JSON.stringify(request.checkedItems))

    // API URLを取得
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    
    // XMLHttpRequestを使用してアップロード進捗を監視
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // 進捗監視
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            }
            onProgress(progress)
          }
        })
      }
      
      // 完了時の処理
      xhr.addEventListener('load', () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response: UploadResponse = JSON.parse(xhr.responseText)
            resolve(response)
          } else {
            // HTTPエラーの場合
            let errorResponse: UploadResponse
            try {
              const serverResponse = JSON.parse(xhr.responseText)
              errorResponse = {
                success: false,
                error: {
                  code: serverResponse.error?.code || getErrorCodeFromStatus(xhr.status),
                  message: serverResponse.error?.message || `サーバーエラーが発生しました (${xhr.status})`,
                  details: serverResponse.error?.details
                }
              }
            } catch {
              errorResponse = {
                success: false,
                error: {
                  code: getErrorCodeFromStatus(xhr.status),
                  message: getErrorMessageFromStatus(xhr.status)
                }
              }
            }
            
            // エラーログ出力
            logError(normalizeError(errorResponse.error), 'uploadImage')
            resolve(errorResponse)
          }
        } catch (error) {
          const normalizedError = normalizeError(error)
          logError(normalizedError, 'uploadImage - response parsing')
          reject(new Error('レスポンスの解析に失敗しました'))
        }
      })
      
      // エラー時の処理
      xhr.addEventListener('error', () => {
        const error = normalizeError(new Error('ネットワークエラーが発生しました'))
        logError(error, 'uploadImage - network error')
        reject(new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。'))
      })
      
      // タイムアウト時の処理
      xhr.addEventListener('timeout', () => {
        const error = normalizeError(new Error('アップロードがタイムアウトしました'))
        logError(error, 'uploadImage - timeout')
        reject(new Error('アップロードがタイムアウトしました。ファイルサイズが大きすぎるか、ネットワークが不安定な可能性があります。'))
      })
      
      // 中断時の処理
      xhr.addEventListener('abort', () => {
        const error = normalizeError(new Error('アップロードが中断されました'))
        logError(error, 'uploadImage - abort')
        reject(new Error('アップロードが中断されました'))
      })
      
      // リクエスト設定
      xhr.timeout = 120000 // 120秒でタイムアウト（大きなファイル対応）
      xhr.open('POST', `${apiUrl}/api/upload`)
      
      // リクエスト送信
      xhr.send(formData)
    })
    
  } catch (error) {
    const normalizedError = normalizeError(error)
    logError(normalizedError, 'uploadImage - general error')
    
    return {
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
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
    case 400:
      return 'リクエストに問題があります。入力内容を確認してください。'
    case 401:
      return 'アクセス権限がありません。'
    case 403:
      return 'この操作を実行する権限がありません。'
    case 404:
      return 'サーバーが見つかりません。'
    case 408:
      return 'リクエストがタイムアウトしました。'
    case 413:
      return 'ファイルサイズが大きすぎます。'
    case 415:
      return 'サポートされていないファイル形式です。'
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください。'
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
 * ファイルサイズを人間が読みやすい形式にフォーマット
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * アップロード可能かどうかをチェック
 */
export const canUpload = (): { canUpload: boolean; reason?: string } => {
  // ネットワーク接続チェック
  if (!navigator.onLine) {
    return {
      canUpload: false,
      reason: 'インターネット接続がありません'
    }
  }

  // ブラウザサポートチェック
  if (!window.FormData || !window.XMLHttpRequest) {
    return {
      canUpload: false,
      reason: 'お使いのブラウザはファイルアップロードをサポートしていません'
    }
  }

  return { canUpload: true }
}