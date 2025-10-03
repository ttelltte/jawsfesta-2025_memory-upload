import React, { useState, useEffect } from 'react'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'
import ErrorMessage from './ErrorMessage'

interface ChecklistFormProps {
  onValidationChange: (isValid: boolean, checkedItems: Record<string, boolean>) => void
  error?: string | null
  showValidationErrors?: boolean
  disabled?: boolean
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({
  onValidationChange,
  error,
  showValidationErrors = false,
  disabled = false
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // 確認項目設定を取得
  useEffect(() => {
    const loadChecklistConfig = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const items = await fetchChecklistConfig()
        setChecklistItems(items)
        
        // 初期状態では全てのチェックボックスをfalseに設定
        const initialCheckedState = items.reduce((acc, item) => {
          acc[item.id] = false
          return acc
        }, {} as Record<string, boolean>)
        setCheckedItems(initialCheckedState)
        
      } catch (err) {
        setLoadError('確認項目の読み込みに失敗しました')
        console.error('確認項目設定の読み込みエラー:', err)
      } finally {
        setLoading(false)
      }
    }

    loadChecklistConfig()
  }, [])

  // バリデーション状態の更新
  useEffect(() => {
    const requiredItems = checklistItems.filter(item => item.required)
    const allRequiredChecked = requiredItems.every(item => checkedItems[item.id] === true)
    
    // バリデーションエラーの更新
    const errors: string[] = []
    if (showValidationErrors && !allRequiredChecked) {
      const uncheckedRequired = requiredItems.filter(item => !checkedItems[item.id])
      if (uncheckedRequired.length > 0) {
        errors.push(`以下の必須項目にチェックを入れてください: ${uncheckedRequired.map(item => `「${item.text}」`).join(', ')}`)
      }
    }
    setValidationErrors(errors)
    
    onValidationChange(allRequiredChecked, checkedItems)
  }, [checkedItems, checklistItems, onValidationChange, showValidationErrors])

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">確認項目</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-4 h-4 bg-gray-300 rounded mt-1"></div>
              <div className="flex-1 h-4 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">確認項目</h3>
        <ErrorMessage message={loadError} />
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="confirmation-items">
      <h3 className="text-lg font-semibold text-gray-800">確認項目</h3>
      


      {/* 一括チェック機能 - コンパクト */}
      {checklistItems.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
          <span className="text-xs font-medium text-gray-700">全ての項目に同意する</span>
          <button
            type="button"
            onClick={() => {
              const allChecked = checklistItems.every(item => checkedItems[item.id])
              const newState: Record<string, boolean> = {}
              checklistItems.forEach(item => {
                newState[item.id] = !allChecked
              })
              setCheckedItems(newState)
            }}
            disabled={disabled}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : checklistItems.every(item => checkedItems[item.id])
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {checklistItems.every(item => checkedItems[item.id]) ? '全て解除' : '全て同意'}
          </button>
        </div>
      )}

      {/* 確認項目チェックリスト - コンパクト、左揃え、クリック可能エリア拡張 */}
      <div className="space-y-2">
        {checklistItems.map((item) => {
          const isChecked = checkedItems[item.id] || false
          const hasValidationError = showValidationErrors && item.required && !isChecked
          
          return (
            <label
              key={item.id}
              className={`
                flex items-start gap-3 p-3 rounded border transition-colors text-sm
                ${disabled 
                  ? 'cursor-not-allowed opacity-60' 
                  : 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
                }
                ${isChecked 
                  ? 'bg-green-50 border-green-200' 
                  : hasValidationError 
                    ? 'bg-red-50 border-red-200' 
                    : 'border-gray-200'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={disabled}
                onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                className={`
                  mt-0.5 w-5 h-5 rounded focus:ring-2 focus:ring-offset-0 flex-shrink-0
                  ${isChecked 
                    ? 'text-green-600 border-green-300 focus:ring-green-500' 
                    : hasValidationError 
                      ? 'text-red-600 border-red-300 focus:ring-red-500' 
                      : 'text-blue-600 border-gray-300 focus:ring-blue-500'
                  }
                `}
              />
              <span className={`
                flex-1 leading-relaxed select-none
                ${isChecked 
                  ? 'text-green-800 font-medium' 
                  : hasValidationError 
                    ? 'text-red-700' 
                    : 'text-gray-700'
                }
              `}>
                {item.text}
                {item.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* バリデーションエラー */}
      {validationErrors.length > 0 && (
        <div className="space-y-1">
          {validationErrors.map((errorMsg, index) => (
            <ErrorMessage key={index} message={errorMsg} type="warning" />
          ))}
        </div>
      )}

      {/* 必須項目の説明 - コンパクト */}
      <p className="text-xs text-gray-500">
        <span className="text-red-500">*</span> 印の項目は必須です
      </p>
    </div>
  )
}