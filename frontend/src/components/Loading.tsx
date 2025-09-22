import React from 'react'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars'
  className?: string
  inline?: boolean
}

const Loading: React.FC<LoadingProps> = ({ 
  message = '読み込み中...', 
  size = 'md',
  variant = 'spinner',
  className = '',
  inline = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const containerClasses = inline 
    ? 'inline-flex items-center space-x-2'
    : 'flex flex-col items-center justify-center p-8'

  const renderSpinner = () => (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-300 border-t-blue-600`}></div>
  )

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} bg-blue-600 rounded-full animate-bounce`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}></div>
  )

  const renderBars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5'} bg-blue-600 animate-pulse`}
          style={{ 
            height: size === 'sm' ? '12px' : size === 'lg' ? '24px' : '16px',
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots()
      case 'pulse':
        return renderPulse()
      case 'bars':
        return renderBars()
      default:
        return renderSpinner()
    }
  }

  return (
    <div className={`${containerClasses} ${className}`}>
      {renderLoader()}
      {message && (
        <p className={`text-gray-600 text-sm ${inline ? '' : 'mt-4'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

// 特定用途向けのローディングコンポーネント
export const ButtonLoading: React.FC<{ message?: string }> = ({ message = '処理中...' }) => (
  <Loading 
    message={message} 
    size="sm" 
    variant="spinner" 
    inline={true}
    className="text-white"
  />
)

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'ページを読み込んでいます...' }) => (
  <div className="min-h-64 flex items-center justify-center">
    <Loading 
      message={message} 
      size="lg" 
      variant="spinner"
    />
  </div>
)

export const InlineLoading: React.FC<{ message?: string }> = ({ message = '読み込み中...' }) => (
  <Loading 
    message={message} 
    size="sm" 
    variant="dots" 
    inline={true}
  />
)

export default Loading