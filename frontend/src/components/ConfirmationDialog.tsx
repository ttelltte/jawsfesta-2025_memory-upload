import React from 'react'
import { type MetadataFormData } from './MetadataForm'

interface ConfirmationDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  metadata: MetadataFormData
  fileName: string
  checkedItems: Record<string, boolean>
  checklistItems: Array<{ id: string; text: string; required: boolean }>
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  metadata,
  fileName,
  checkedItems,
  checklistItems
}) => {
  if (!isOpen) return null

  const checkedItemsText = checklistItems
    .filter(item => checkedItems[item.id])
    .map(item => item.text)

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

            {/* 確認済み項目 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">確認済み項目</h4>
              <div className="bg-green-50 p-3 rounded">
                <ul className="space-y-1">
                  {checkedItemsText.map((text, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span className="text-green-800 text-xs">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 重要な注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">重要な注意事項</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• アップロード後の画像は即座にパブリックに公開されます</li>
                <li>• 不適切な内容と判断された場合、予告なく削除される場合があります</li>
                <li>• 30日後に自動的に削除されます</li>
              </ul>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              アップロード実行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}