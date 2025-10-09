import React, { useState } from 'react'

interface DeleteRequestDialogProps {
  isOpen: boolean
  onConfirm: (deleteReason: string) => Promise<void>
  onCancel: () => void
  photoId: string
  uploaderName?: string
}

export const DeleteRequestDialog: React.FC<DeleteRequestDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  photoId,
  uploaderName
}) => {
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      await onConfirm(deleteReason)
      // 成功したらフォームをリセット
      setDeleteReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除リクエストの送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setDeleteReason('')
    setError(null)
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3 text-center">
            削除リクエスト
          </h3>

          <div className="space-y-3 text-sm">
            {/* 説明 */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-xs text-blue-800">
                <i className="fas fa-info-circle mr-1"></i>
                この画像の削除を管理者にリクエストします。管理者が確認後、対応いたします。
              </p>
            </div>

            {/* 画像情報 */}
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">
                <span className="font-medium">画像ID:</span> {photoId}
              </p>
              {uploaderName && (
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">投稿者:</span> {uploaderName}
                </p>
              )}
            </div>

            {/* 削除理由入力 */}
            <div>
              <label htmlFor="deleteReason" className="block text-xs font-medium text-gray-700 mb-1">
                削除理由（任意）
              </label>
              <textarea
                id="deleteReason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="削除を希望する理由を入力してください（任意）"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-2 rounded">
                <p className="text-xs text-red-800">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  {error}
                </p>
              </div>
            )}

            {/* 注意事項 */}
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
              <p className="text-xs text-yellow-800">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                削除リクエストは管理者に通知されます。即座に削除されるわけではありません。
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                  送信中...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-1"></i>
                  削除リクエストを送信
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
