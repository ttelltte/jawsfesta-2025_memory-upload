import React, { useState } from 'react'
import { ImageUpload, MetadataForm, ChecklistForm, ConfirmationDialog, type MetadataFormData } from '../components'
import { validateFile } from '../utils'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'

export const UploadPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMetadataForm, setShowMetadataForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checklistValid, setChecklistValid] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [checklistError, setChecklistError] = useState<string | null>(null)
  const [showChecklistValidation, setShowChecklistValidation] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingMetadata, setPendingMetadata] = useState<MetadataFormData | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setSelectedImage(null)
      setError(null)
      setShowMetadataForm(false)
      return
    }

    // 詳細なファイルバリデーション
    const validation = validateFile(file, {
      maxSizeInMB: 10,
      allowedTypes: ['image/*']
    })

    if (!validation.isValid) {
      setError(validation.error || '不正なファイルです')
      setSelectedImage(null)
      setShowMetadataForm(false)
      return
    }

    setSelectedImage(file)
    setError(null)
    setShowMetadataForm(true)
  }

  const handleChecklistValidation = (isValid: boolean, items: Record<string, boolean>) => {
    setChecklistValid(isValid)
    setCheckedItems(items)
    setChecklistError(null)
  }

  // 確認項目設定を取得（確認ダイアログ用）
  React.useEffect(() => {
    const loadChecklistItems = async () => {
      try {
        const items = await fetchChecklistConfig()
        setChecklistItems(items)
      } catch (error) {
        console.error('確認項目の取得に失敗:', error)
      }
    }
    loadChecklistItems()
  }, [])

  const handleMetadataSubmit = async (metadata: MetadataFormData) => {
    if (!selectedImage) return

    // 確認項目のバリデーション
    if (!checklistValid) {
      setChecklistError('全ての必須項目にチェックを入れてください')
      setShowChecklistValidation(true)
      return
    }

    // 最終確認ダイアログを表示
    setPendingMetadata(metadata)
    setShowConfirmDialog(true)
  }

  const handleConfirmUpload = async () => {
    if (!selectedImage || !pendingMetadata) return

    setShowConfirmDialog(false)
    setIsSubmitting(true)
    setError(null)
    setChecklistError(null)

    try {
      // TODO: 次のタスクで実際のアップロード処理を実装
      console.log('アップロード予定のデータ:', {
        file: selectedImage,
        metadata: pendingMetadata,
        checkedItems
      })
      
      // 仮の処理時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 成功時の処理（次のタスクで実装）
      alert('アップロードが完了しました！（仮の処理）')
      
      // フォームをリセット
      setSelectedImage(null)
      setShowMetadataForm(false)
      setChecklistValid(false)
      setCheckedItems({})
      setShowChecklistValidation(false)
      setPendingMetadata(null)
      
    } catch (err) {
      setError('アップロードに失敗しました。しばらく待ってから再試行してください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelUpload = () => {
    setShowConfirmDialog(false)
    setPendingMetadata(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        画像アップロード
      </h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <ImageUpload
          onImageSelect={handleImageSelect}
          selectedImage={selectedImage}
          error={error}
        />
        
        {/* メタデータ入力フォーム */}
        {showMetadataForm && selectedImage && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                画像の詳細情報
              </h2>
              <MetadataForm
                onSubmit={handleMetadataSubmit}
                isSubmitting={isSubmitting}
                error={error}
                disabled={!checklistValid}
              />
            </div>
            
            {/* 確認項目チェックリスト */}
            <div className="pt-6 border-t border-gray-200">
              <ChecklistForm
                onValidationChange={handleChecklistValidation}
                error={checklistError}
                showValidationErrors={showChecklistValidation}
              />
            </div>
          </div>
        )}

        {/* 確認ダイアログ */}
        {showConfirmDialog && selectedImage && pendingMetadata && (
          <ConfirmationDialog
            isOpen={showConfirmDialog}
            onConfirm={handleConfirmUpload}
            onCancel={handleCancelUpload}
            metadata={pendingMetadata}
            fileName={selectedImage.name}
            checkedItems={checkedItems}
            checklistItems={checklistItems}
          />
        )}
      </div>
    </div>
  )
}