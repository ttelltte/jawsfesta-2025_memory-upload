import React, { useState, useEffect } from 'react'
import { ImageUpload, MetadataForm, ConfirmationDialog, UploadProgress, ErrorMessage, type MetadataFormData, GallerySkeleton } from '../components'
import { UploadSuccessMessage } from '../components/SuccessMessage'
import { validateFile, normalizeError, logError } from '../utils'

import { uploadImage, canUpload, type UploadProgress as UploadProgressType } from '../api/upload'
import { fetchPhotos, Photo } from '../api/photos'

type LayoutType = 'masonry' | 'grid'

// マソンリーレイアウトコンポーネント
const MasonryLayout: React.FC<{ photos: Photo[], onImageClick: (photo: Photo) => void }> = ({ photos, onImageClick }) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // スマホの場合は2列、それ以外は複数列
  const columnCount = isMobile ? 2 : Math.min(Math.max(2, Math.floor(window.innerWidth / 250)), 6)
  
  // 写真を列に分散
  const columns: Photo[][] = Array.from({ length: columnCount }, () => [])
  
  photos.forEach((photo, index) => {
    const columnIndex = index % columnCount
    columns[columnIndex].push(photo)
  })

  return (
    <div className="flex gap-2 sm:gap-3">
      {columns.map((columnPhotos, columnIndex) => (
        <div key={columnIndex} className="flex-1 space-y-2 sm:space-y-3">
          {columnPhotos.map((photo) => (
            <div key={photo.id}>
              <div 
                className="group relative rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer" 
                onClick={() => onImageClick(photo)}
              >
                {photo.presignedUrl ? (
                  <img
                    src={photo.presignedUrl}
                    alt={photo.comment || '投稿画像'}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-32 sm:h-40 flex items-center justify-center text-gray-400 bg-gray-100">
                    <div className="text-center">
                      <i className="fas fa-image text-2xl sm:text-3xl mb-2"></i>
                      <div className="text-xs sm:text-sm">画像なし</div>
                    </div>
                  </div>
                )}
                
                {/* 撮影者名を左上にオーバーレイ（匿名以外の場合のみ） */}
                {photo.uploaderName && photo.uploaderName !== 'Anonymous' && photo.uploaderName !== '匿名' && (
                  <div className="absolute top-1 left-1 bg-black bg-opacity-30 text-white px-1.5 py-0.5 rounded text-xs max-w-[70%] truncate">
                    {photo.uploaderName.length > 8 ? `${photo.uploaderName.substring(0, 8)}...` : photo.uploaderName}
                  </div>
                )}
                
                {/* ホバー時の詳細表示 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-center">
                    <i className="fas fa-search-plus text-2xl sm:text-3xl mb-2"></i>
                    <div className="text-xs sm:text-sm font-medium">詳細を見る</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export const HomePage: React.FC = () => {
  // アップロード関連のstate
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMetadataForm, setShowMetadataForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingMetadata, setPendingMetadata] = useState<MetadataFormData | null>(null)
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



  const handleMetadataSubmit = async (metadata: MetadataFormData) => {
    if (!selectedImage) return

    setPendingMetadata(metadata)
    setShowConfirmDialog(true)
  }

  const handleConfirmUpload = async (checkedItems: Record<string, boolean>) => {
    if (!selectedImage || !pendingMetadata) return

    const uploadCheck = canUpload()
    if (!uploadCheck.canUpload) {
      setError(uploadCheck.reason || 'アップロードできません')
      return
    }

    setShowConfirmDialog(false)
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)
    setUploadProgress(null)
    setUploadError(null)

    try {
      const response = await uploadImage(
        {
          file: selectedImage,
          uploaderName: pendingMetadata.uploaderName,
          comment: pendingMetadata.comment,
          checkedItems: checkedItems // 確認ダイアログからのチェック状態を渡す
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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* ヘッダー - 改善されたタイトル配置 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <i className="fas fa-camera text-2xl sm:text-3xl md:text-4xl text-blue-600"></i>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 leading-tight">
                JAWS FESTA 2025
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-blue-600 font-medium">
                思い出アップロード
              </p>
            </div>
          </div>
        </div>

        {/* アップロードセクション - スマホ優先 */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <i className="fas fa-cloud-upload-alt text-xl sm:text-2xl text-blue-600"></i>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                思い出をアップロード
              </h2>
            </div>
          </div>
          
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
                
                {/* アップロード進捗 - アップロードボタンの直後 */}
                {uploadProgress && selectedImage && isSubmitting && (
                  <div className="mt-4">
                    <UploadProgress
                      progress={uploadProgress}
                      fileName={selectedImage.name}
                      isUploading={isSubmitting}
                    />
                  </div>
                )}
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
              selectedImage={selectedImage}
            />
          )}
        </div>

        {/* ギャラリーセクション - スマホ優先 */}
        <div id="gallery-section" className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <i className="fas fa-images text-xl sm:text-2xl text-blue-600"></i>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                思い出ギャラリー
              </h2>
            </div>
            
            {!galleryLoading && !galleryError && photos.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <div className="text-gray-600 text-sm sm:text-base">
                  {photos.length}枚の思い出
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">表示:</span>
                  <button
                    onClick={() => setLayout('masonry')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                      layout === 'masonry'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <i className="fas fa-grip"></i>
                    <span className="hidden sm:inline">マソンリー</span>
                  </button>
                  <button
                    onClick={() => setLayout('grid')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                      layout === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <i className="fas fa-square"></i>
                    <span className="hidden sm:inline">グリッド</span>
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
                <MasonryLayout photos={photos} onImageClick={handleImageClick} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer" 
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
                              <i className="fas fa-image text-3xl sm:text-4xl mb-3"></i>
                              <div className="text-sm">画像なし</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                          <div className="text-white text-center">
                            <i className="fas fa-search-plus text-2xl sm:text-3xl mb-2"></i>
                            <div className="text-xs sm:text-sm font-medium">詳細を見る</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-user text-gray-500 text-sm"></i>
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {photo.uploaderName && photo.uploaderName !== 'Anonymous' 
                              ? (photo.uploaderName.length > 15 ? `${photo.uploaderName.substring(0, 15)}...` : photo.uploaderName)
                              : '匿名'
                            }
                          </span>
                        </div>
                        
                        {photo.comment && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {photo.comment}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <i className="fas fa-clock"></i>
                          <span>
                            {new Date(photo.uploadTime).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Tokyo'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 画像詳細モーダル - 画像最大表示 */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={handleCloseDetail}>
            <div className="relative w-full h-full max-w-7xl mx-auto p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* ヘッダー */}
              <div className="flex justify-between items-center mb-4 text-white">
                <div className="flex items-center gap-3">
                  <i className="fas fa-image text-xl"></i>
                  <h3 className="text-lg sm:text-xl font-bold">画像詳細</h3>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="text-white hover:text-gray-300 text-2xl sm:text-3xl leading-none p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              {/* 画像表示エリア - サイズ制限 */}
              <div className="flex-1 flex items-center justify-center mb-4 min-h-0">
                {selectedPhoto.presignedUrl ? (
                  <img
                    src={selectedPhoto.presignedUrl}
                    alt={selectedPhoto.comment || '投稿画像'}
                    className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-gray-400 bg-gray-800 rounded-lg">
                    <div className="text-center">
                      <i className="fas fa-image text-6xl mb-4"></i>
                      <div className="text-lg">画像なし</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 詳細情報 - コンパクト表示 */}
              <div className="bg-white rounded-xl p-4 sm:p-6 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-user text-blue-600"></i>
                    <div>
                      <div className="text-xs text-gray-500">投稿者</div>
                      <div className="font-medium text-gray-900">
                        {selectedPhoto.uploaderName && selectedPhoto.uploaderName !== 'Anonymous' ? selectedPhoto.uploaderName : '匿名'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-green-600"></i>
                    <div>
                      <div className="text-xs text-gray-500">投稿日時</div>
                      <div className="text-sm text-gray-900">
                        {new Date(selectedPhoto.uploadTime).toLocaleString('ja-JP', {
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
                  
                  <div className="sm:col-span-1">
                    <button
                      onClick={handleCloseDetail}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <i className="fas fa-times mr-2"></i>
                      閉じる
                    </button>
                  </div>
                </div>
                
                {selectedPhoto.comment && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-comment text-purple-600 mt-1"></i>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">コメント</div>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {selectedPhoto.comment}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}