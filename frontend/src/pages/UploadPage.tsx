import React, { useState } from 'react'
import { ImageUpload, MetadataForm, ChecklistForm, ConfirmationDialog, UploadProgress, ErrorMessage, type MetadataFormData } from '../components'
import { UploadSuccessMessage } from '../components/SuccessMessage'
import { validateFile, normalizeError, logError } from '../utils'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'
import { uploadImage, canUpload, type UploadProgress as UploadProgressType } from '../api/upload'

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<unknown>(null)

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
        const normalizedError = normalizeError(error)
        logError(normalizedError, 'loadChecklistItems')
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

    // アップロード可能かチェック
    const uploadCheck = canUpload()
    if (!uploadCheck.canUpload) {
      setError(uploadCheck.reason || 'アップロードできません')
      return
    }

    setShowConfirmDialog(false)
    setIsSubmitting(true)
    setError(null)
    setChecklistError(null)
    setSuccessMessage(null)
    setUploadProgress(null)
    setUploadError(null)

    try {
      // アップロード処理を実行
      const response = await uploadImage(
        {
          file: selectedImage,
          uploaderName: pendingMetadata.uploaderName,
          comment: pendingMetadata.comment,
          checkedItems
        },
        (progress) => {
          setUploadProgress(progress)
        }
      )

      if (response.success && response.data) {
        // 成功時の処理
        setSuccessMessage(selectedImage.name)
        
        // フォームをリセット
        setSelectedImage(null)
        setShowMetadataForm(false)
        setChecklistValid(false)
        setCheckedItems({})
        setShowChecklistValidation(false)
        setPendingMetadata(null)
        setUploadProgress(null)
        
      } else {
        // エラー時の処理
        const error = response.error || { code: 'UPLOAD_ERROR', message: 'アップロードに失敗しました' }
        setUploadError(error)
        setUploadProgress(null)
        
        // エラーログ出力
        logError(normalizeError(error), 'handleConfirmUpload')
      }
      
    } catch (err) {
      const normalizedError = normalizeError(err)
      logError(normalizedError, 'handleConfirmUpload')
      setUploadError(normalizedError)
      setUploadProgress(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelUpload = () => {
    setShowConfirmDialog(false)
    setPendingMetadata(null)
  }

  const handleCloseSuccessMessage = () => {
    setSuccessMessage(null)
  }

  const handleViewGallery = () => {
    window.location.href = '/gallery'
  }

  const handleRetryUpload = () => {
    setUploadError(null)
    setError(null)
    // 確認ダイアログを再表示
    if (selectedImage && pendingMetadata) {
      setShowConfirmDialog(true)
    }
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="upload-container">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        思い出をアップロード
      </h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6">
            <UploadSuccessMessage
              fileName={successMessage}
              onViewGallery={handleViewGallery}
              onClose={handleCloseSuccessMessage}
            />
          </div>
        )}

        {/* アップロードエラーメッセージ */}
        {uploadError && (
          <div className="mb-6">
            <ErrorMessage
              error={uploadError}
              showRetry={true}
              onRetry={handleRetryUpload}
              onDismiss={() => setUploadError(null)}
            />
          </div>
        )}

        {/* アップロード進捗 */}
        {uploadProgress && selectedImage && (
          <div className="mb-6">
            <UploadProgress
              progress={uploadProgress}
              fileName={selectedImage.name}
              isUploading={isSubmitting}
            />
          </div>
        )}

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
                disabled={!checklistValid || isSubmitting}
              />
            </div>
            
            {/* 確認項目チェックリスト */}
            <div className="pt-6 border-t border-gray-200">
              <ChecklistForm
                onValidationChange={handleChecklistValidation}
                error={checklistError}
                showValidationErrors={showChecklistValidation}
                disabled={isSubmitting}
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