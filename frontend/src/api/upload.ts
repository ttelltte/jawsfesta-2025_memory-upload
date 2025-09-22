// Upload API クライアント

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
              errorResponse = JSON.parse(xhr.responseText)
            } catch {
              errorResponse = {
                success: false,
                error: {
                  code: 'HTTP_ERROR',
                  message: `サーバーエラーが発生しました (${xhr.status})`
                }
              }
            }
            resolve(errorResponse)
          }
        } catch (error) {
          reject(new Error('レスポンスの解析に失敗しました'))
        }
      })
      
      // エラー時の処理
      xhr.addEventListener('error', () => {
        reject(new Error('ネットワークエラーが発生しました'))
      })
      
      // タイムアウト時の処理
      xhr.addEventListener('timeout', () => {
        reject(new Error('アップロードがタイムアウトしました'))
      })
      
      // リクエスト設定
      xhr.timeout = 60000 // 60秒でタイムアウト
      xhr.open('POST', `${apiUrl}/api/upload`)
      
      // リクエスト送信
      xhr.send(formData)
    })
    
  } catch (error) {
    console.error('アップロードエラー:', error)
    return {
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'アップロードに失敗しました'
      }
    }
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