// エラーハンドリングユーティリティ

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: number
}

export interface ErrorDisplayInfo {
  title: string
  message: string
  actionText?: string
  actionHandler?: () => void
  severity: 'error' | 'warning' | 'info'
}

/**
 * エラーコードの定義
 */
export const ERROR_CODES = {
  // ネットワークエラー
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // サーバーエラー
  SERVER_ERROR: 'SERVER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_SIZE_ERROR: 'FILE_SIZE_ERROR',
  FILE_TYPE_ERROR: 'FILE_TYPE_ERROR',
  
  // アップロードエラー
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // データ取得エラー
  FETCH_ERROR: 'FETCH_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  
  // 認証・認可エラー
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // 不明なエラー
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

/**
 * エラーを標準化されたAppError形式に変換
 */
export const normalizeError = (error: unknown): AppError => {
  const timestamp = Date.now()

  // 既にAppError形式の場合
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return {
      ...(error as AppError),
      timestamp
    }
  }

  // Error オブジェクトの場合
  if (error instanceof Error) {
    // ネットワークエラーの判定
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        details: error.message,
        timestamp
      }
    }

    // タイムアウトエラーの判定
    if (error.message.includes('timeout') || error.message.includes('タイムアウト')) {
      return {
        code: ERROR_CODES.TIMEOUT_ERROR,
        message: '処理がタイムアウトしました。しばらく待ってから再試行してください。',
        details: error.message,
        timestamp
      }
    }

    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || '予期しないエラーが発生しました',
      timestamp
    }
  }

  // 文字列の場合
  if (typeof error === 'string') {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error,
      timestamp
    }
  }

  // その他の場合
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: '予期しないエラーが発生しました',
    details: error,
    timestamp
  }
}

/**
 * エラーをユーザーフレンドリーな表示情報に変換
 */
export const getErrorDisplayInfo = (error: AppError): ErrorDisplayInfo => {
  switch (error.code) {
    case ERROR_CODES.NETWORK_ERROR:
      return {
        title: 'ネットワークエラー',
        message: 'インターネット接続を確認して、再試行してください。',
        actionText: '再試行',
        actionHandler: () => window.location.reload(),
        severity: 'error'
      }

    case ERROR_CODES.TIMEOUT_ERROR:
      return {
        title: 'タイムアウトエラー',
        message: '処理に時間がかかっています。しばらく待ってから再試行してください。',
        actionText: '再試行',
        actionHandler: () => window.location.reload(),
        severity: 'warning'
      }

    case ERROR_CODES.CONNECTION_ERROR:
      return {
        title: '接続エラー',
        message: 'サーバーに接続できません。しばらく待ってから再試行してください。',
        actionText: '再試行',
        actionHandler: () => window.location.reload(),
        severity: 'error'
      }

    case ERROR_CODES.SERVER_ERROR:
    case ERROR_CODES.INTERNAL_ERROR:
      return {
        title: 'サーバーエラー',
        message: 'サーバーで問題が発生しています。しばらく待ってから再試行してください。',
        actionText: '再試行',
        actionHandler: () => window.location.reload(),
        severity: 'error'
      }

    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return {
        title: 'サービス利用不可',
        message: 'サービスが一時的に利用できません。しばらく待ってから再試行してください。',
        actionText: '再試行',
        actionHandler: () => window.location.reload(),
        severity: 'warning'
      }

    case ERROR_CODES.FILE_SIZE_ERROR:
      return {
        title: 'ファイルサイズエラー',
        message: 'ファイルサイズが上限（10MB）を超えています。',
        severity: 'warning'
      }

    case ERROR_CODES.FILE_TYPE_ERROR:
      return {
        title: 'ファイル形式エラー',
        message: '対応していないファイル形式です。画像ファイルを選択してください。',
        severity: 'warning'
      }

    case ERROR_CODES.VALIDATION_ERROR:
      return {
        title: '入力エラー',
        message: error.message || '入力内容に問題があります。',
        severity: 'warning'
      }

    case ERROR_CODES.UPLOAD_ERROR:
    case ERROR_CODES.UPLOAD_FAILED:
      return {
        title: 'アップロードエラー',
        message: 'ファイルのアップロードに失敗しました。再試行してください。',
        actionText: '再試行',
        severity: 'error'
      }

    case ERROR_CODES.FETCH_ERROR:
      return {
        title: 'データ取得エラー',
        message: 'データの取得に失敗しました。再読み込みしてください。',
        actionText: '再読み込み',
        actionHandler: () => window.location.reload(),
        severity: 'error'
      }

    case ERROR_CODES.DATA_NOT_FOUND:
      return {
        title: 'データが見つかりません',
        message: '要求されたデータが見つかりませんでした。',
        severity: 'info'
      }

    case ERROR_CODES.UNAUTHORIZED:
      return {
        title: '認証エラー',
        message: 'アクセス権限がありません。',
        severity: 'error'
      }

    case ERROR_CODES.FORBIDDEN:
      return {
        title: 'アクセス拒否',
        message: 'この操作を実行する権限がありません。',
        severity: 'error'
      }

    default:
      return {
        title: 'エラー',
        message: error.message || '予期しないエラーが発生しました。',
        actionText: '再読み込み',
        actionHandler: () => window.location.reload(),
        severity: 'error'
      }
  }
}

/**
 * HTTPステータスコードからエラーコードを判定
 */
export const getErrorCodeFromStatus = (status: number): string => {
  if (status >= 500) {
    return ERROR_CODES.SERVER_ERROR
  }
  if (status === 404) {
    return ERROR_CODES.DATA_NOT_FOUND
  }
  if (status === 401) {
    return ERROR_CODES.UNAUTHORIZED
  }
  if (status === 403) {
    return ERROR_CODES.FORBIDDEN
  }
  if (status === 408) {
    return ERROR_CODES.TIMEOUT_ERROR
  }
  if (status === 503) {
    return ERROR_CODES.SERVICE_UNAVAILABLE
  }
  if (status >= 400) {
    return ERROR_CODES.VALIDATION_ERROR
  }
  
  return ERROR_CODES.UNKNOWN_ERROR
}

/**
 * エラーログを出力（開発環境のみ）
 */
export const logError = (error: AppError, context?: string) => {
  if (import.meta.env.DEV) {
    console.group(`🚨 Error ${context ? `in ${context}` : ''}`)
    console.error('Code:', error.code)
    console.error('Message:', error.message)
    console.error('Timestamp:', new Date(error.timestamp).toISOString())
    if (error.details) {
      console.error('Details:', error.details)
    }
    console.groupEnd()
  }
}