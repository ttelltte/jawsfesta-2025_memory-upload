import React, { useState, useEffect } from 'react'

interface SuccessMessageProps {
  message: string
  title?: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
  showProgress?: boolean
  actionText?: string
  actionHandler?: () => void
  className?: string
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  title,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000,
  showProgress = false,
  actionText,
  actionHandler,
  className = ''
}) => {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(true)

  // 自動クローズ機能とプログレスバー
  useEffect(() => {
    if (autoClose && onClose) {
      const startTime = Date.now()
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, autoCloseDelay - elapsed)
        const progressValue = (remaining / autoCloseDelay) * 100
        
        setProgress(progressValue)
        
        if (remaining <= 0) {
          setIsVisible(false)
          setTimeout(() => onClose(), 300) // フェードアウト後にクローズ
        }
      }

      const interval = setInterval(updateProgress, 50)
      
      return () => clearInterval(interval)
    }
  }, [autoClose, autoCloseDelay, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <div 
      className={`transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`}
    >
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`} data-testid="success-message">
        <div className="flex items-start">
          {/* 成功アイコン */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="h-5 w-5 text-green-600"
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
          </div>
          
          {/* メッセージ */}
          <div className="ml-3 flex-1">
            {title && (
              <h3 className="text-sm font-medium text-green-800 mb-1">
                {title}
              </h3>
            )}
            <p className="text-sm text-green-700">
              {message}
            </p>
            
            {/* アクションボタン */}
            {actionText && actionHandler && (
              <div className="mt-3">
                <button
                  onClick={actionHandler}
                  className="text-sm font-medium text-green-800 hover:text-green-900 underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 rounded"
                >
                  {actionText}
                </button>
              </div>
            )}
          </div>
          
          {/* クローズボタン */}
          {onClose && (
            <div className="ml-auto pl-3">
              <button
                onClick={handleClose}
                className="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 rounded-md p-1"
              >
                <span className="sr-only">閉じる</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        {/* プログレスバー */}
        {showProgress && autoClose && (
          <div className="mt-3">
            <div className="w-full bg-green-200 rounded-full h-1">
              <div 
                className="bg-green-500 h-1 rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 特定用途向けの成功メッセージコンポーネント
export const UploadSuccessMessage: React.FC<{
  fileName: string
  onViewGallery?: () => void
  onClose?: () => void
}> = ({ fileName, onViewGallery, onClose }) => (
  <SuccessMessage
    title="アップロード完了"
    message={`「${fileName}」のアップロードが完了しました。他の参加者と思い出を共有できます。`}
    actionText="ギャラリーを見る"
    actionHandler={onViewGallery}
    onClose={onClose}
    autoClose={true}
    autoCloseDelay={8000}
    showProgress={true}
  />
)

export const FormSuccessMessage: React.FC<{
  message: string
  onClose?: () => void
}> = ({ message, onClose }) => (
  <SuccessMessage
    message={message}
    onClose={onClose}
    autoClose={true}
    autoCloseDelay={5000}
    showProgress={true}
  />
)