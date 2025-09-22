import React from 'react'

interface ErrorMessageProps {
  message: string
  type?: 'error' | 'warning' | 'info'
  onClose?: () => void
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  type = 'error',
  onClose 
}) => {
  const typeStyles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconMap = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div className={`border rounded-md p-4 ${typeStyles[type]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{iconMap[type]}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <span className="sr-only">閉じる</span>
              <span className="text-lg">✕</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage