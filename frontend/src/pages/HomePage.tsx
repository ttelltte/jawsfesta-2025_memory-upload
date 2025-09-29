import React, { useState, useEffect } from 'react'
import { ImageUpload, MetadataForm, ConfirmationDialog, UploadProgress, ErrorMessage, type MetadataFormData, GallerySkeleton, AdminEditDialog } from '../components'
import { UploadSuccessMessage } from '../components/SuccessMessage'
import { validateFile, normalizeError, logError } from '../utils'
import { useAdmin } from '../hooks/useAdmin'

import { uploadImage, canUpload, type UploadProgress as UploadProgressType } from '../api/upload'
import { fetchPhotos, Photo } from '../api/photos'
import { deletePhoto, updatePhoto } from '../api/admin'

type LayoutType = 'masonry' | 'grid'

// マソンリーレイアウトコンポーネント
const MasonryLayout: React.FC<{ 
  photos: Photo[], 
  onImageClick: (photo: Photo) => void,
  isAdmin?: boolean,
  onAdminEdit?: (photo: Photo) => void
}> = ({ photos, onImageClick, isAdmin = false, onAdminEdit }) => {
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

                {/* 管理者ボタン */}
                {isAdmin && onAdminEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onAdminEdit(photo)
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg z-20"
                    style={{ zIndex: 20 }}
                  >
                    <i className="fas fa-cog text-sm"></i>
                  </button>
                )}
                
                {/* ホバー時の詳細表示 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
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
  
  // ページネーション関連のstate
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // 管理者機能関連のstate
  const isAdmin = useAdmin()
  const [showAdminEdit, setShowAdminEdit] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)

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
        // 新しい画像は最新なので1ページ目に戻る
        setCurrentPage(1)
        
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

  // ページネーション関連の処理
  const totalPages = Math.ceil(photos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPhotos = photos.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // 表示件数変更時は1ページ目に戻る
  }

  // 管理者機能のハンドラー
  const handleAdminEdit = (photo: Photo) => {
    console.log('管理者編集ボタンがクリックされました:', photo.id)
    setEditingPhoto(photo)
    setShowAdminEdit(true)
  }

  const handleAdminSave = async (updates: any) => {
    if (!editingPhoto) return

    try {
      const response = await updatePhoto(editingPhoto.id, updates)
      if (response.success) {
        // ギャラリーを更新
        loadPhotos()
        setShowAdminEdit(false)
        setEditingPhoto(null)
      } else {
        console.error('更新エラー:', response.error)
      }
    } catch (error) {
      console.error('更新エラー:', error)
    }
  }

  const handleAdminDelete = async () => {
    if (!editingPhoto) return

    try {
      const response = await deletePhoto(editingPhoto.id)
      if (response.success) {
        // ギャラリーを更新
        loadPhotos()
        setShowAdminEdit(false)
        setEditingPhoto(null)
      } else {
        console.error('削除エラー:', response.error)
      }
    } catch (error) {
      console.error('削除エラー:', error)
    }
  }

  const handleAdminCancel = () => {
    setShowAdminEdit(false)
    setEditingPhoto(null)
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
    <div className="min-h-screen relative" style={{
      backgroundImage: 'url(/assets/background_gold_large.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      fontFamily: '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "HG明朝", serif'
    }}>
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-white bg-opacity-85"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          {/* メインロゴ */}
          <div className="mb-4">
            <img 
              src="/assets/JAWSFESTA2025筆文字_1色_金.png" 
              alt="JAWS FESTA 2025" 
              className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl h-auto object-contain"
            />
          </div>
          
          {/* サブタイトル */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            お祭りトラック：思い出アップロード
          </h1>
          
          {isAdmin && (
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              <i className="fas fa-shield-alt"></i>
              管理者モード
            </div>
          )}
        </div>

        {/* アップロードセクション */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
          
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

        {/* ギャラリーセクション */}
        <div id="gallery-section">
          {!galleryLoading && !galleryError && photos.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4 mb-6">
              {/* 上段：思い出の件数 */}
              <div className="flex items-center justify-center mb-4">
                <div className="text-gray-700 font-medium text-base sm:text-lg">
                  {photos.length}枚の思い出
                </div>
              </div>
              
              {/* 下段：コントロール */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* 左側：表示件数選択 */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                  <i className="fas fa-list text-gray-500"></i>
                  <span className="text-sm text-gray-600 font-medium">表示件数:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={12}>12件</option>
                    <option value={20}>20件</option>
                    <option value={36}>36件</option>
                    <option value={50}>50件</option>
                  </select>
                </div>

                {/* 中央：現在の表示範囲 */}
                <div className="text-sm text-gray-500">
                  {startIndex + 1}-{Math.min(endIndex, photos.length)}件を表示中
                </div>
                
                {/* 右側：レイアウト切り替え */}
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                  <i className="fas fa-eye text-gray-500"></i>
                  <span className="text-sm text-gray-600 font-medium">表示:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLayout('masonry')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                        layout === 'masonry'
                          ? 'bg-yellow-600 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <i className="fas fa-grip"></i>
                      <span className="hidden sm:inline">マソンリー</span>
                    </button>
                    <button
                      onClick={() => setLayout('grid')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                        layout === 'grid'
                          ? 'bg-yellow-600 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <i className="fas fa-square"></i>
                      <span className="hidden sm:inline">グリッド</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <MasonryLayout 
                  photos={currentPhotos} 
                  onImageClick={handleImageClick}
                  isAdmin={isAdmin}
                  onAdminEdit={handleAdminEdit}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {currentPhotos.map((photo) => (
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
                            className="w-full h-full object-contain"
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
                        
                        {/* 管理者ボタン */}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleAdminEdit(photo)
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg z-20"
                            style={{ zIndex: 20 }}
                          >
                            <i className="fas fa-cog text-sm"></i>
                          </button>
                        )}

                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100 z-10">
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

          {/* ページネーション */}
          {!galleryLoading && !galleryError && photos.length > 0 && totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2">
                {/* 前のページ */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  <i className="fas fa-chevron-left mr-1"></i>
                  前へ
                </button>

                {/* ページ番号 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number
                    
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (currentPage <= 4) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      pageNum = currentPage - 3 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                {/* 次のページ */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  次へ
                  <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 管理者編集ダイアログ */}
        <AdminEditDialog
          isOpen={showAdminEdit}
          photo={editingPhoto}
          onSave={handleAdminSave}
          onCancel={handleAdminCancel}
          onDelete={handleAdminDelete}
        />

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