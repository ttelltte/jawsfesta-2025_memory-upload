import React, { useState, useEffect } from 'react'
import ErrorMessage from './ErrorMessage'
import { getUserName, saveUserName, clearUserName } from '../utils/userNameStorage'

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

  // コンポーネントマウント時に保存された名前を読み込み
  useEffect(() => {
    const storedName = getUserName()
    if (storedName) {
      setFormData(prev => ({
        ...prev,
        uploaderName: storedName
      }))
    }
  }, [])

  // フォーム入力の変更処理
  const handleInputChange = (field: keyof MetadataFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 名前入力時に自動保存
    if (field === 'uploaderName') {
      if (value.trim()) {
        saveUserName(value.trim())
      }
    }
    
    // 入力時にバリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // 名前クリア処理
  const handleClearName = () => {
    setFormData(prev => ({
      ...prev,
      uploaderName: ''
    }))
    clearUserName()
  }

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Partial<MetadataFormData> = {}
    
    // 名前のバリデーション（任意だが、入力された場合は長さチェック）
    if (formData.uploaderName.trim().length > 20) {
      errors.uploaderName = '名前は20文字以内で入力してください'
    }
    
    // 一言のバリデーション（任意だが、入力された場合は長さチェック）
    if (formData.comment.trim().length > 100) {
      errors.comment = '一言は100文字以内で入力してください'
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* エラーメッセージ */}
      {error && <ErrorMessage message={error} type="error" />}
      
      {/* 名前入力フィールド - コンパクト */}
      <div>
        <label htmlFor="uploaderName" className="block text-xs font-medium text-gray-700 mb-1">
          お名前（任意・空欄で匿名）
        </label>
        <div className="relative">
          <input
            type="text"
            id="uploaderName"
            value={formData.uploaderName}
            onChange={(e) => handleInputChange('uploaderName', e.target.value)}
            placeholder="例: 山田太郎"
            className={`
              w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-yellow-500
              ${formData.uploaderName ? 'pr-16' : ''}
              ${validationErrors.uploaderName 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300'
              }
            `}
            disabled={isSubmitting || disabled}
            maxLength={20}
            data-testid="uploader-name"
          />
          {formData.uploaderName && (
            <button
              type="button"
              onClick={handleClearName}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
              disabled={isSubmitting || disabled}
              data-testid="clear-name-button"
            >
              クリア
            </button>
          )}
        </div>
        {validationErrors.uploaderName && (
          <p className="mt-0.5 text-xs text-red-600">{validationErrors.uploaderName}</p>
        )}
      </div>

      {/* 一言入力フィールド - コンパクト */}
      <div>
        <label htmlFor="comment" className="block text-xs font-medium text-gray-700 mb-1">
          一言（任意）
        </label>
        <textarea
          id="comment"
          value={formData.comment}
          onChange={(e) => handleInputChange('comment', e.target.value)}
          placeholder="例: お祭り最高！！"
          rows={2}
          className={`
            w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-vertical
            ${validationErrors.comment 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300'
            }
          `}
          disabled={isSubmitting || disabled}
          maxLength={100}
          data-testid="comment"
        />
        {validationErrors.comment && (
          <p className="mt-0.5 text-xs text-red-600">{validationErrors.comment}</p>
        )}
        <div className="mt-0.5 text-right text-xs text-gray-400">
          {formData.comment.length}/100
        </div>
      </div>

      {/* 送信ボタン - コンパクト */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className={`
            w-full py-2 px-3 rounded text-sm font-medium transition-colors
            ${isSubmitting || disabled
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }
          `}
          data-testid="upload-button"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              アップロード中...
            </span>
          ) : (
            'アップロード'
          )}
        </button>
      </div>
    </form>
  )
}