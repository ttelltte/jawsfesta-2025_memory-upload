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
    <div className="space-y-4" data-testid="confirmation-items">
      <h3 className="text-lg font-semibold text-gray-800">確認項目</h3>
      
      {/* 注意事項の表示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">重要な注意事項</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 写真はパブリックに公開されます</li>
          <li>• JAWS-UG行動規範に沿った内容ではないと判断した場合、その場で削除・注意をします</li>
          <li>• 30日後に自動的に削除されます</li>
        </ul>
      </div>

      {/* 確認項目チェックリスト */}
      <div className="space-y-3">
        {checklistItems.map((item) => {
          const isChecked = checkedItems[item.id] || false
          const hasValidationError = showValidationErrors && item.required && !isChecked
          
          return (
            <label
              key={item.id}
              className={`
                flex items-start space-x-3 p-3 rounded-lg border transition-colors
                ${disabled 
                  ? 'cursor-not-allowed opacity-60' 
                  : 'cursor-pointer group'
                }
                ${isChecked 
                  ? 'bg-green-50 border-green-200' 
                  : hasValidationError 
                    ? 'bg-red-50 border-red-200' 
                    : disabled 
                      ? 'bg-gray-100 border-gray-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={disabled}
                onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                className={`
                  mt-1 w-4 h-4 rounded focus:ring-2
                  ${disabled 
                    ? 'cursor-not-allowed opacity-60' 
                    : ''
                  }
                  ${isChecked 
                    ? 'text-green-600 border-green-300 focus:ring-green-500' 
                    : hasValidationError 
                      ? 'text-red-600 border-red-300 focus:ring-red-500' 
                      : 'text-blue-600 border-gray-300 focus:ring-blue-500'
                  }
                `}
              />
              <span className={`
                text-sm leading-relaxed flex-1
                ${isChecked 
                  ? 'text-green-800 font-medium' 
                  : hasValidationError 
                    ? 'text-red-700' 
                    : 'text-gray-700 group-hover:text-gray-900'
                }
              `}>
                {item.text}
                {item.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                {isChecked && (
                  <span className="ml-2 text-green-600">✓</span>
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
        <div className="space-y-2">
          {validationErrors.map((errorMsg, index) => (
            <ErrorMessage key={index} message={errorMsg} type="warning" />
          ))}
        </div>
      )}

      {/* 必須項目の説明 */}
      <p className="text-xs text-gray-500">
        <span className="text-red-500">*</span> 印の項目は必須です。全ての必須項目にチェックを入れてからアップロードしてください。
      </p>
    </div>
  )
}