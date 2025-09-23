import React, { useState, useEffect } from 'react'
import { ImageUpload, MetadataForm, ChecklistForm, ConfirmationDialog, UploadProgress, ErrorMessage, type MetadataFormData, GallerySkeleton } from '../components'
import { UploadSuccessMessage } from '../components/SuccessMessage'
import { validateFile, normalizeError, logError } from '../utils'
import { fetchChecklistConfig, type ChecklistItem } from '../api/config'
import { uploadImage, canUpload, type UploadProgress as UploadProgressType } from '../api/upload'
import { fetchPhotos, Photo } from '../api/photos'

type LayoutType = 'masonry' | 'grid'

export const HomePage: React.FC = () => {
  // アップロード関連のstate
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

  // ギャラリー関連のstate
  const [photos, setPhotos] = useState<Photo[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [galleryError, setGalleryError] = useState<unknown>(null)
  const [layout, setLayout] = useState<LayoutType>('masonry')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  // アップロード関連の処理
  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setSelectedImage(null)
      setError(null)
      setShowMetadataForm(false)
      return
    }

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

  const handleMetadataSubmit = async (metadata: MetadataFormData) => {
    if (!selectedImage) return

    if (!checklistValid) {
      setChecklistError('全ての必須項目にチェックを入れてください')
      setShowChecklistValidation(true)
      return
    }

    setPendingMetadata(metadata)
    setShowConfirmDialog(true)
  }

  const handleConfirmUpload = async () => {
    if (!selectedImage || !pendingMetadata) return

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
        setSuccessMessage(selectedImage.name)
        
        // フォームをリセット
        setSelectedImage(null)
        setShowMetadataForm(false)
        setChecklistValid(false)
        setCheckedItems({})
        setShowChecklistValidation(false)
        setPendingMetadata(null)
        setUploadProgress(null)
        
        // ギャラリーを更新
        loadPhotos()
        
      } else {
        const error = response.error || { code: 'UPLOAD_ERROR', message: 'アップロードに失敗しました' }
        setUploadError(error)
        setUploadProgress(null)
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

  const handleRetryUpload = () => {
    setUploadError(null)
    setError(null)
    if (selectedImage && pendingMetadata) {
      setShowConfirmDialog(true)
    }
  }

  // ギャラリー関連の処理
  const loadPhotos = async () => {
    try {
      setGalleryLoading(true)
      setGalleryError(null)
      
      const response = await fetchPhotos()
      
      if (response.success) {
        const sortedPhotos = response.photos.sort((a, b) => b.uploadTimeUnix - a.uploadTimeUnix)
        setPhotos(sortedPhotos)
      } else {
        const error = response.error || { code: 'FETCH_ERROR', message: '画像の取得に失敗しました' }
        setGalleryError(error)
        logError(normalizeError(error), 'loadPhotos')
      }
    } catch (err) {
      const normalizedError = normalizeError(err)
      logError(normalizedError, 'loadPhotos')
      setGalleryError(normalizedError)
    } finally {
      setGalleryLoading(false)
    }
  }

  const handleImageClick = (photo: Photo) => {
    setSelectedPhoto(photo)
  }

  const handleCloseDetail = () => {
    setSelectedPhoto(null)
  }

  const handleGalleryRetry = () => {
    setGalleryError(null)
    loadPhotos()
  }

  // 初期化処理
  useEffect(() => {
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
    loadPhotos()
  }, [])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedPhoto) {
        handleCloseDetail()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPhoto])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            JAWS FESTA 2025
          </h1>
          <p className="text-xl text-gray-600">
            思い出を共有しよう
          </p>
        </div>

        {/* アップロードセクション */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
            📷 思い出をアップロード
          </h2>
          
          {/* 成功メッセージ */}
          {successMessage && (
            <div className="mb-6">
              <UploadSuccessMessage
                fileName={successMessage}
                onViewGallery={() => {
                  // ギャラリーセクションにスクロール
                  document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
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
          {uploadProgress && selectedImage && isSubmitting && (
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
            <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  画像の詳細情報
                </h3>
                <MetadataForm
                  onSubmit={handleMetadataSubmit}
                  isSubmitting={isSubmitting}
                  error={error}
                  disabled={isSubmitting}
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

        {/* ギャラリーセクション */}
        <div id="gallery-section" className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              🖼️ 思い出ギャラリー
            </h2>
            
            {!galleryLoading && !galleryError && photos.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-gray-600">
                  {photos.length}枚の思い出
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">表示:</span>
                  <button
                    onClick={() => setLayout('masonry')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      layout === 'masonry'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    📱 マソンリー
                  </button>
                  <button
                    onClick={() => setLayout('grid')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      layout === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    🔲 グリッド
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ギャラリーコンテンツ */}
          {galleryLoading ? (
            <GallerySkeleton layout={layout} count={12} />
          ) : galleryError ? (
            <ErrorMessage 
              error={galleryError}
              showRetry={true}
              onRetry={handleGalleryRetry}
            />
          ) : photos.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">📷</div>
              <p className="text-gray-600 text-xl mb-2">まだ画像がありません</p>
              <p className="text-gray-500">最初の思い出を投稿してみませんか？</p>
            </div>
          ) : (
            <>
              {layout === 'masonry' ? (
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="break-inside-avoid mb-3">
                      <div 
                        className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer" 
                        onClick={() => handleImageClick(photo)}
                      >
                        <div className="relative">
                          {photo.presignedUrl ? (
                            <img
                              src={photo.presignedUrl}
                              alt={photo.comment || '投稿画像'}
                              className="w-full h-auto object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center text-gray-400 bg-gray-100">
                              <div className="text-center">
                                <div className="text-xl mb-1">📷</div>
                                <div className="text-xs">画像なし</div>
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="text-white text-center">
                              <div className="text-2xl mb-2">🔍</div>
                              <div className="text-sm">詳細を見る</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer" 
                      onClick={() => handleImageClick(photo)}
                    >
                      <div className="bg-gray-100 relative aspect-square">
                        {photo.presignedUrl ? (
                          <img
                            src={photo.presignedUrl}
                            alt={photo.comment || '投稿画像'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="text-2xl mb-2">📷</div>
                              <div className="text-sm">画像なし</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          {photo.uploaderName && photo.uploaderName !== 'Anonymous' ? photo.uploaderName : '匿名'}
                        </div>
                        
                        {photo.comment && (
                          <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {photo.comment}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {new Date(photo.uploadTime).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Tokyo'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 画像詳細モーダル */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={handleCloseDetail}>
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 bg-gray-100 flex items-center justify-center">
                  {selectedPhoto.presignedUrl ? (
                    <img
                      src={selectedPhoto.presignedUrl}
                      alt={selectedPhoto.comment || '投稿画像'}
                      className="max-w-full max-h-[60vh] object-contain"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-4">📷</div>
                        <div className="text-lg">画像なし</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="w-full md:w-80 p-6 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">詳細情報</h3>
                    <button
                      onClick={handleCloseDetail}
                      className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">投稿者</label>
                      <div className="text-lg text-gray-900">{selectedPhoto.uploaderName && selectedPhoto.uploaderName !== 'Anonymous' ? selectedPhoto.uploaderName : '匿名'}</div>
                    </div>
                    
                    {selectedPhoto.comment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
                        <div className="text-gray-900 whitespace-pre-wrap break-words">
                          {selectedPhoto.comment}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">投稿日時</label>
                      <div className="text-gray-900">
                        {new Date(selectedPhoto.uploadTime).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Asia/Tokyo'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCloseDetail}
                      className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}