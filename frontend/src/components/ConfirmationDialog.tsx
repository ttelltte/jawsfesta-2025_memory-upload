import React, { useState, useEffect } from 'react'
import { type MetadataFormData } from './MetadataForm'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'

interface ConfirmationDialogProps {
  isOpen: boolean
  onConfirm: (checkedItems: Record<string, boolean>) => void
  onCancel: () => void
  metadata: MetadataFormData
  fileName: string
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  metadata,
  fileName
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // 確認項目設定を取得
  useEffect(() => {
    const loadChecklistConfig = async () => {
      if (!isOpen) return
      
      try {
        setLoading(true)
        const items = await fetchChecklistConfig()
        setChecklistItems(items)
        
        // 初期状態では全てのチェックボックスをfalseに設定
        const initialCheckedState = items.reduce((acc, item) => {
          acc[item.id] = false
          return acc
        }, {} as Record<string, boolean>)
        setCheckedItems(initialCheckedState)
        
      } catch (err) {
        console.error('確認項目設定の読み込みエラー:', err)
      } finally {
        setLoading(false)
      }
    }

    loadChecklistConfig()
  }, [isOpen])

  // ダイアログが閉じられた時に状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setCheckedItems({})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked
    }))
  }

  const allRequiredChecked = checklistItems
    .filter(item => item.required)
    .every(item => checkedItems[item.id] === true)

  const handleConfirm = () => {
    if (allRequiredChecked) {
      onConfirm(checkedItems)
    }
  }

  // 一括チェック機能
  const handleCheckAll = () => {
    const allChecked = checklistItems.every(item => checkedItems[item.id])
    const newState: Record<string, boolean> = {}
    checklistItems.forEach(item => {
      newState[item.id] = !allChecked
    })
    setCheckedItems(newState)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            アップロード内容の最終確認
          </h3>
          
          <div className="space-y-4 text-sm">
            {/* ファイル情報 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">ファイル情報</h4>
              <div className="bg-gray-50 p-3 rounded">
                <p><span className="font-medium">ファイル名:</span> {fileName}</p>
              </div>
            </div>

            {/* メタデータ */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">詳細情報</h4>
              <div className="bg-gray-50 p-3 rounded space-y-1">
                <p><span className="font-medium">名前:</span> {metadata.uploaderName}</p>
                <p><span className="font-medium">コメント:</span> {metadata.comment || '（なし）'}</p>
              </div>
            </div>

            {/* 確認項目 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">確認項目</h4>
              
              {loading ? (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">確認項目を読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded space-y-3">
                    {checklistItems.map((item) => {
                      const isChecked = checkedItems[item.id] || false
                      
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-3 text-sm cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors ${
                            isChecked ? 'bg-green-50 border border-green-200' : 'border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                            className="mt-0.5 w-5 h-5 text-blue-600 bg-white border-2 border-gray-400 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                            style={{
                              accentColor: '#3b82f6',
                              transform: 'scale(1.2)'
                            }}
                          />
                          <span className={`flex-1 leading-relaxed ${isChecked ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                            {item.text}
                            {item.required && (
                              <span className="text-red-500 ml-1 font-bold">*</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  
                  {/* すべて同意ボタンを確認項目のすぐ下に配置 */}
                  {checklistItems.length > 0 && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={handleCheckAll}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                          checklistItems.every(item => checkedItems[item.id])
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {checklistItems.every(item => checkedItems[item.id]) ? '全て解除' : 'すべて同意'}
                      </button>
                    </div>
                  )}
                  
                  {/* 必須項目の説明 */}
                  <p className="text-xs text-gray-500 text-center">
                    <span className="text-red-500 font-bold">*</span> 印の項目は必須です
                  </p>
                </div>
              )}
            </div>

            {/* 重要な注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                重要な注意事項
              </h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• アップロード後の画像は即座にパブリックに公開されます</li>
                <li>• JAWS-UG行動規範に沿わない内容は削除・注意の対象となります</li>
                <li>• イベント終了後一定期間経過後に自動削除されます</li>
              </ul>
            </div>


          </div>

          {/* バリデーションエラーメッセージ */}
          {!allRequiredChecked && checklistItems.some(item => item.required) && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <i className="fas fa-exclamation-triangle"></i>
                <span className="font-medium text-sm">
                  必須項目にチェックを入れてください
                </span>
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allRequiredChecked}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                allRequiredChecked
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              アップロード実行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}