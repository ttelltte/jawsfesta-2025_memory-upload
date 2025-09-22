import React from 'react'
import { AppError, ErrorDisplayInfo, getErrorDisplayInfo, normalizeError } from '../utils/errorHandler'

interface ErrorMessageProps {
  error?: string | Error | AppError | unknown
  message?: string
  title?: string
  actionText?: string
  actionHandler?: () => void
  severity?: 'error' | 'warning' | 'info'
  className?: string
  showRetry?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  // 後方互換性のため
  type?: 'error' | 'warning' | 'info'
  onClose?: () => void
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error,
  message,
  title,
  actionText,
  actionHandler,
  severity,
  className = '',
  showRetry = false,
  onRetry,
  onDismiss,
  // 後方互換性
  type,
  onClose
}) => {
  // 後方互換性の処理
  const finalSeverity = severity || type || 'error'
  const finalOnDismiss = onDismiss || onClose

  // エラー情報を正規化
  let displayInfo: ErrorDisplayInfo
  
  if (error) {
    const normalizedError = normalizeError(error)
    displayInfo = getErrorDisplayInfo(normalizedError)
  } else {
    displayInfo = {
      title: title || 'エラー',
      message: message || '予期しないエラーが発生しました',
      actionText,
      actionHandler,
      severity: finalSeverity
    }
  }

  // 重要度に応じたスタイル
  const severityStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const styles = severityStyles[displayInfo.severity]

  // アイコンの選択
  const getIcon = () => {
    switch (displayInfo.severity) {
      case 'error':
        return (
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className={`h-5 w-5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  if (!displayInfo.message && !message) return null

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`} data-testid="error-message">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          {displayInfo.title && (
            <h3 className={`text-sm font-medium ${styles.title} mb-1`}>
              {displayInfo.title}
            </h3>
          )}
          <p className={`text-sm ${styles.message}`}>
            {displayInfo.message}
          </p>
        </div>
        
        {/* 閉じるボタン */}
        {finalOnDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={finalOnDismiss}
              className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
            >
              <span className="sr-only">閉じる</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* アクションボタン */}
      {(displayInfo.actionText || showRetry) && (
        <div className="mt-4">
          <div className="flex space-x-2">
            {displayInfo.actionText && displayInfo.actionHandler && (
              <button
                onClick={displayInfo.actionHandler}
                className={`px-3 py-2 text-sm font-medium rounded-md ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
              >
                {displayInfo.actionText}
              </button>
            )}
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`px-3 py-2 text-sm font-medium rounded-md ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
              >
                再試行
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ErrorMessage