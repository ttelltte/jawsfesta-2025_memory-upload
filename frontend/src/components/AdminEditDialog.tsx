import React, { useState, useEffect } from 'react'
import { Photo } from '../api/photos'

interface AdminEditDialogProps {
  isOpen: boolean
  photo: Photo | null
  onSave: (updates: { uploaderName?: string; comment?: string; rotation?: number }) => void
  onCancel: () => void
  onDelete: () => void
}

export const AdminEditDialog: React.FC<AdminEditDialogProps> = ({
  isOpen,
  photo,
  onSave,
  onCancel,
  onDelete
}) => {
  const [uploaderName, setUploaderName] = useState('')
  const [comment, setComment] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (photo && isOpen) {
      setUploaderName(photo.uploaderName || '')
      setComment(photo.comment || '')
      setShowDeleteConfirm(false)
    }
  }, [photo, isOpen])

  if (!isOpen || !photo) return null

  const handleSave = () => {
    const updates: any = {}
    
    if (uploaderName !== photo.uploaderName) {
      updates.uploaderName = uploaderName
    }
    if (comment !== photo.comment) {
      updates.comment = comment
    }

    onSave(updates)
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete()
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const hasChanges = uploaderName !== photo.uploaderName || 
                    comment !== photo.comment

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i className="fas fa-cog text-blue-600"></i>
              管理者編集
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* プレビュー画像 */}
          {photo.presignedUrl && (
            <div className="mb-4">
              <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={photo.presignedUrl}
                  alt="プレビュー"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* 投稿者名編集 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                投稿者名
              </label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="投稿者名を入力"
              />
            </div>

            {/* コメント編集 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                コメント
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="コメントを入力"
              />
            </div>


          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-3 mt-6">
            {/* 保存ボタン */}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-save mr-2"></i>
              変更を保存
            </button>

            {/* 削除ボタン */}
            <button
              onClick={handleDelete}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                showDeleteConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              <i className={`fas ${showDeleteConfirm ? 'fa-exclamation-triangle' : 'fa-trash'} mr-2`}></i>
              {showDeleteConfirm ? '本当に削除しますか？' : '画像を削除'}
            </button>

            {/* キャンセルボタン */}
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}