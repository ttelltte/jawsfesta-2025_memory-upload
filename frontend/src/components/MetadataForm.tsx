import React, { useState } from 'react'
import ErrorMessage from './ErrorMessage'

export interface MetadataFormData {
  uploaderName: string
  comment: string
}

interface MetadataFormProps {
  onSubmit: (data: MetadataFormData) => void
  isSubmitting?: boolean
  error?: string | null
  disabled?: boolean
}

export const MetadataForm: React.FC<MetadataFormProps> = ({
  onSubmit,
  isSubmitting = false,
  error,
  disabled = false
}) => {
  const [formData, setFormData] = useState<MetadataFormData>({
    uploaderName: '',
    comment: ''
  })
  const [validationErrors, setValidationErrors] = useState<Partial<MetadataFormData>>({})

  // フォーム入力の変更処理
  const handleInputChange = (field: keyof MetadataFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 入力時にバリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Partial<MetadataFormData> = {}
    
    // 名前のバリデーション（任意だが、入力された場合は長さチェック）
    if (formData.uploaderName.trim().length > 50) {
      errors.uploaderName = '名前は50文字以内で入力してください'
    }
    
    // コメントのバリデーション（任意だが、入力された場合は長さチェック）
    if (formData.comment.trim().length > 500) {
      errors.comment = 'コメントは500文字以内で入力してください'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // フォーム送信処理
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    // 空文字の場合はデフォルト値を設定
    const processedData: MetadataFormData = {
      uploaderName: formData.uploaderName.trim() || '匿名',
      comment: formData.comment.trim()
    }
    
    onSubmit(processedData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラーメッセージ */}
      {error && <ErrorMessage message={error} type="error" />}
      
      {/* 名前入力フィールド */}
      <div>
        <label htmlFor="uploaderName" className="block text-sm font-medium text-gray-700 mb-2">
          お名前（任意）
        </label>
        <input
          type="text"
          id="uploaderName"
          value={formData.uploaderName}
          onChange={(e) => handleInputChange('uploaderName', e.target.value)}
          placeholder="例: 山田太郎"
          className={`
            w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
            ${validationErrors.uploaderName 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300'
            }
          `}
          disabled={isSubmitting || disabled}
          maxLength={50}
        />
        {validationErrors.uploaderName && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.uploaderName}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          空欄の場合は「匿名」として表示されます
        </p>
      </div>

      {/* コメント入力フィールド */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          コメント（任意）
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => handleInputChange('comment', e.target.value)}
          placeholder="例: JAWS FESTA 2025で撮影しました！とても楽しかったです。"
          rows={4}
          className={`
            w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical
            ${validationErrors.comment 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300'
            }
          `}
          disabled={isSubmitting || disabled}
          maxLength={500}
        />
        {validationErrors.comment && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.comment}</p>
        )}
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>思い出や感想を自由にお書きください</span>
          <span>{formData.comment.length}/500</span>
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            ${isSubmitting || disabled
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              アップロード中...
            </span>
          ) : disabled ? (
            '確認項目をチェックしてください'
          ) : (
            'アップロード'
          )}
        </button>
      </div>
    </form>
  )
}