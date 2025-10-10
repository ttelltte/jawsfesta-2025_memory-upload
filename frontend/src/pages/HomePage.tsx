import React, { useState, useEffect } from 'react'
import { ImageUpload, MetadataForm, ConfirmationDialog, UploadProgress, ErrorMessage, type MetadataFormData, GallerySkeleton, AdminEditDialog } from '../components'
import { DeleteRequestDialog } from '../components/DeleteRequestDialog'
import { UploadSuccessMessage } from '../components/SuccessMessage'
import { validateFile, normalizeError, logError } from '../utils'
import { useAdmin } from '../hooks/useAdmin'

import { uploadImage, canUpload, type UploadProgress as UploadProgressType } from '../api/upload'
import { fetchPhotos, Photo } from '../api/photos'
import { deletePhoto, updatePhoto } from '../api/admin'
import { sendDeleteRequest } from '../api/deleteRequest'

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

  // 削除リクエスト関連のstate
  const [showDeleteRequest, setShowDeleteRequest] = useState(false)
  const [deleteRequestPhoto, setDeleteRequestPhoto] = useState<Photo | null>(null)
  const [deleteRequestSuccess, setDeleteRequestSuccess] = useState(false)

  // フローティングボタン関連のstate
  const [showFloatingButton, setShowFloatingButton] = useState(false)

  // アップロード関連の処理
  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setSelectedImage(null)
      setError(null)
      setShowMetadataForm(false)
      return
    }

    const validation = validateFile(file, {
      maxSizeInMB: 7, // Base64エンコード後のサイズを考慮（API Gateway 10MB制限対応）
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

  // 削除リクエスト関連の処理
  const handleDeleteRequest = (photo: Photo) => {
    setDeleteRequestPhoto(photo)
    setShowDeleteRequest(true)
    setDeleteRequestSuccess(false)
  }

  const handleConfirmDeleteRequest = async (deleteReason: string) => {
    if (!deleteRequestPhoto) return

    try {
      const response = await sendDeleteRequest({
        photoId: deleteRequestPhoto.id,
        deleteReason: deleteReason || undefined
      })

      if (response.success) {
        setDeleteRequestSuccess(true)
        setTimeout(() => {
          setShowDeleteRequest(false)
          setDeleteRequestPhoto(null)
          setDeleteRequestSuccess(false)
        }, 2000)
      }
    } catch (error) {
      throw error
    }
  }

  const handleCancelDeleteRequest = () => {
    setShowDeleteRequest(false)
    setDeleteRequestPhoto(null)
    setDeleteRequestSuccess(false)
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

  // URLパラメータからphotoIdを取得して管理者編集ダイアログを開く
  useEffect(() => {
    if (photos.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const photoId = params.get('photoId')
    const deleteReason = params.get('deleteReason')
    const requestTime = params.get('requestTime')

    if (photoId && isAdmin) {
      // 該当の画像を探す
      const targetPhoto = photos.find(p => p.id === photoId)
      
      if (targetPhoto) {
        // 少し遅延させてDOMが確実にレンダリングされるのを待つ
        setTimeout(() => {
          // 管理者編集ダイアログを開く
          setEditingPhoto(targetPhoto)
          setShowAdminEdit(true)
          
          // 削除依頼情報をセッションストレージに保存（ダイアログで表示するため）
          if (deleteReason || requestTime) {
            sessionStorage.setItem('deleteRequest', JSON.stringify({
              deleteReason: deleteReason || '',
              requestTime: requestTime || ''
            }))
          }
          
          // photoId, deleteReason, requestTimeパラメータを削除（adminパラメータは保持）
          params.delete('photoId')
          params.delete('deleteReason')
          params.delete('requestTime')
          const newSearch = params.toString()
          const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
          window.history.replaceState({}, '', newUrl)
        }, 500)
      }
    }
  }, [photos, isAdmin])

  // フローティングボタンの表示制御
  useEffect(() => {
    // アップロード画面（メタデータフォーム）が表示されていない場合のみ表示
    setShowFloatingButton(!showMetadataForm)
  }, [showMetadataForm])

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

  // フローティングボタンのクリックハンドラー
  const handleFloatingButtonClick = () => {
    // カメラ撮影モードで直接開く
    const cameraInput = document.createElement('input')
    cameraInput.type = 'file'
    cameraInput.accept = 'image/*'
    cameraInput.capture = 'environment' // 背面カメラを優先
    cameraInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        handleImageSelect(file)
        // アップロードセクションにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    cameraInput.click()
  }

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
      
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* ヘッダー - コンパクト */}
        <div className="text-center mb-4">
          {/* メインロゴ - 小さく */}
          <div className="mb-2">
            <img 
              src="/assets/JAWSFESTA2025筆文字_1色_金.png" 
              alt="JAWS FESTA 2025" 
              className="mx-auto w-full max-w-xs sm:max-w-sm h-auto object-contain"
            />
          </div>
          
          {/* サブタイトル - コンパクト */}
          <h1 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
            お祭りトラック：思い出アップロード
          </h1>
          
          {isAdmin && (
            <div className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
              <i className="fas fa-shield-alt"></i>
              管理者モード
            </div>
          )}
        </div>

        {/* アップロードセクション - コンパクト */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-6">
          
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
          
          {/* メタデータ入力フォーム - コンパクト */}
          {showMetadataForm && selectedImage && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  名前と一言を入力
                </h3>
                <MetadataForm
                  onSubmit={handleMetadataSubmit}
                  isSubmitting={isSubmitting}
                  error={error}
                  disabled={isSubmitting}
                />
                
                {/* アップロード進捗 - アップロードボタンの直後 */}
                {uploadProgress && selectedImage && isSubmitting && (
                  <div className="mt-3">
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
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-2 sm:p-3 mb-4">
              {/* コンパクトなコントロール - 1行に */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                {/* 左側：件数 */}
                <div className="text-gray-700 font-medium">
                  {photos.length}枚
                </div>
                
                {/* 中央：表示件数 */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">表示:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={36}>36</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                
                {/* 右側：レイアウト切り替え */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLayout('masonry')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      layout === 'masonry'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <i className="fas fa-grip"></i>
                  </button>
                  <button
                    onClick={() => setLayout('grid')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      layout === 'grid'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <i className="fas fa-square"></i>
                  </button>
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
                      : 'bg-white text-gray-700 hover:bg-yellow-50 border border-yellow-400'
                  }`}
                  style={currentPage !== 1 ? { borderColor: '#FFD700' } : {}}
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
                            ? 'text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-yellow-50 border border-yellow-400'
                        }`}
                        style={currentPage === pageNum ? { backgroundColor: '#FFD700' } : { borderColor: '#FFD700' }}
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
                      : 'bg-white text-gray-700 hover:bg-yellow-50 border border-yellow-400'
                  }`}
                  style={currentPage !== totalPages ? { borderColor: '#FFD700' } : {}}
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

        {/* フローティングアップロードボタン */}
        {showFloatingButton && (
          <button
            onClick={handleFloatingButtonClick}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 z-40 flex items-center justify-center"
            style={{ backgroundColor: '#FFD700' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFC700'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFD700'}
            aria-label="アップロードエリアに戻る"
          >
            <i className="fas fa-camera text-xl text-black"></i>
          </button>
        )}

        {/* 画像詳細モーダル - 画像最大表示 */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-2 sm:p-4" onClick={handleCloseDetail}>
            <div className="relative w-full h-full max-w-6xl mx-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* ヘッダー - メタデータ表示 */}
              <div className="bg-white bg-opacity-95 rounded-t-xl px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0 shadow-lg mb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* 日時 - 控えめ */}
                    <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                      <i className="fas fa-clock"></i>
                      <span>
                        {new Date(selectedPhoto.uploadTime).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Tokyo'
                        })}
                      </span>
                    </div>
                    
                    {/* 投稿者 - 目立たせる */}
                    <div className="flex items-center gap-2">
                      <i className="fas fa-user text-blue-600 text-lg"></i>
                      <span className="text-gray-900 font-bold text-base sm:text-lg">
                        {selectedPhoto.uploaderName && selectedPhoto.uploaderName !== 'Anonymous' ? selectedPhoto.uploaderName : '匿名'}
                      </span>
                    </div>
                    
                    {/* コメント - 目立たせる */}
                    {selectedPhoto.comment && (
                      <div className="flex items-start gap-2">
                        <i className="fas fa-comment text-purple-600 text-lg mt-0.5 flex-shrink-0"></i>
                        <p className="text-gray-900 text-base sm:text-lg font-medium leading-relaxed">
                          {selectedPhoto.comment}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* 右上ボタンエリア */}
                  <div className="flex items-start gap-2 flex-shrink-0">
                    {/* 削除依頼ボタン */}
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          handleDeleteRequest(selectedPhoto)
                          handleCloseDetail()
                        }}
                        className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-2 font-medium shadow-sm"
                        title="この画像の削除を管理者にリクエストします"
                      >
                        <i className="fas fa-flag text-base"></i>
                        <span className="hidden sm:inline">削除依頼</span>
                      </button>
                    )}
                    
                    {/* 閉じるボタン */}
                    <button
                      onClick={handleCloseDetail}
                      className="w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-lg hover:scale-110 flex-shrink-0"
                      style={{ backgroundColor: '#FFD700', color: '#000' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFC700'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFD700'}
                    >
                      <i className="fas fa-times text-xl"></i>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 画像表示エリア - 最大化 */}
              <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                {selectedPhoto.presignedUrl ? (
                  <img
                    src={selectedPhoto.presignedUrl}
                    alt={selectedPhoto.comment || '投稿画像'}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
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
            </div>
          </div>
        )}

        {/* 削除リクエストダイアログ */}
        {showDeleteRequest && deleteRequestPhoto && (
          <DeleteRequestDialog
            isOpen={showDeleteRequest}
            onConfirm={handleConfirmDeleteRequest}
            onCancel={handleCancelDeleteRequest}
            photoId={deleteRequestPhoto.id}
            uploaderName={deleteRequestPhoto.uploaderName}
            imageUrl={deleteRequestPhoto.presignedUrl}
          />
        )}

        {/* 削除リクエスト成功メッセージ */}
        {deleteRequestSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            <i className="fas fa-check-circle mr-2"></i>
            削除リクエストを送信しました
          </div>
        )}
      </div>
    </div>
  )
}