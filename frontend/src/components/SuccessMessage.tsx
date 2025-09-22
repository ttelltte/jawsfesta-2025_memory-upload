import React from 'react'

interface SuccessMessageProps {
  message: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000
}) => {
  // 自動クローズ機能
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDelay, onClose])

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start">
        {/* 成功アイコン */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        {/* メッセージ */}
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-green-800">
            {message}
          </p>
        </div>
        
        {/* クローズボタン */}
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 rounded-md"
            >
              <span className="sr-only">閉じる</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}