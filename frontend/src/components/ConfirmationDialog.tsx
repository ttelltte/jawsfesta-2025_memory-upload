import React, { useState, useEffect } from 'react'
import { type MetadataFormData } from './MetadataForm'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'

interface ConfirmationDialogProps {
  isOpen: boolean
  onConfirm: (checkedItems: Record<string, boolean>) => void
  onCancel: () => void
  metadata: MetadataFormData
  fileName: string
  selectedImage: File | null
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  metadata,
  fileName,
  selectedImage
}) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

  // プレビュー画像の生成
  useEffect(() => {
    if (selectedImage && isOpen) {
      const url = URL.createObjectURL(selectedImage)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [selectedImage, isOpen])

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[95vh] overflow-y-auto">
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3 text-center">
            内容確認
          </h3>
          
          <div className="space-y-3 text-sm">
            {/* 画像プレビューと情報 */}
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex gap-3">
                {/* 小さなプレビュー画像 */}
                {previewUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={previewUrl}
                      alt="プレビュー"
                      className="w-16 h-16 object-cover rounded border"
                    />
                  </div>
                )}
                {/* ファイル・メタデータ情報 */}
                <div className="flex-1 text-xs space-y-1">
                  <p><span className="font-medium">ファイル:</span> {fileName.length > 15 ? `${fileName.substring(0, 15)}...` : fileName}</p>
                  <p><span className="font-medium">名前:</span> {metadata.uploaderName}</p>
                  {metadata.comment && (
                    <p><span className="font-medium">コメント:</span> {metadata.comment.length > 25 ? `${metadata.comment.substring(0, 25)}...` : metadata.comment}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 確認項目 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">確認項目</h4>
              
              {loading ? (
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 rounded space-y-2">
                    {checklistItems.map((item) => {
                      const isChecked = checkedItems[item.id] || false
                      
                      return (
                        <label
                          key={item.id}
                          className="flex items-start gap-3 text-xs cursor-pointer p-2"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                            className="mt-0.5 cursor-pointer"
                            style={{
                              width: '18px',
                              height: '18px',
                              accentColor: '#2563eb',
                              flexShrink: 0
                            }}
                          />
                          <span className="flex-1 leading-tight select-none text-gray-700">
                            {item.text}
                            {item.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  
                  {/* すべて同意ボタンをコンパクトに */}
                  {checklistItems.length > 0 && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleCheckAll}
                        className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                          checklistItems.every(item => checkedItems[item.id])
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <i className={`fas ${checklistItems.every(item => checkedItems[item.id]) ? 'fa-times' : 'fa-check-double'} mr-1`}></i>
                        {checklistItems.every(item => checkedItems[item.id]) ? '全て解除' : 'すべて同意'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 重要な注意事項をコンパクトに */}
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
              <p className="text-xs text-yellow-800 font-medium flex items-center gap-1">
                <i className="fas fa-exclamation-triangle"></i>
                画像は公開され、イベント終了後一定期間後に削除されます
              </p>
            </div>


          </div>

          {/* バリデーションエラーメッセージ */}
          {!allRequiredChecked && checklistItems.some(item => item.required) && (
            <div className="bg-red-50 border border-red-200 p-2 rounded">
              <div className="flex items-center gap-1 text-red-800">
                <i className="fas fa-exclamation-triangle text-xs"></i>
                <span className="font-medium text-xs">
                  必須項目にチェックを入れてください
                </span>
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allRequiredChecked}
              className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
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