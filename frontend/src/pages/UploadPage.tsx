import React, { useState } from 'react'
import { ImageUpload, MetadataForm, type MetadataFormData } from '../components'
import { validateFile } from '../utils'

export const UploadPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMetadataForm, setShowMetadataForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleMetadataSubmit = async (metadata: MetadataFormData) => {
    if (!selectedImage) return

    setIsSubmitting(true)
    setError(null)

    try {
      // TODO: 次のタスクで実際のアップロード処理を実装
      console.log('アップロード予定のデータ:', {
        file: selectedImage,
        metadata
      })
      
      // 仮の処理時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 成功時の処理（次のタスクで実装）
      alert('アップロードが完了しました！（仮の処理）')
      
      // フォームをリセット
      setSelectedImage(null)
      setShowMetadataForm(false)
      
    } catch (err) {
      setError('アップロードに失敗しました。しばらく待ってから再試行してください。')
    } finally {
      setIsSubmitting(false)
    }
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
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              画像の詳細情報
            </h2>
            <MetadataForm
              onSubmit={handleMetadataSubmit}
              isSubmitting={isSubmitting}
              error={error}
            />
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">注意:</span> 次のステップで確認項目のチェックが必要です
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}