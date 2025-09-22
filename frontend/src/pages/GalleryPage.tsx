import { useState, useEffect } from 'react'
import { fetchPhotos, Photo } from '../api/photos'
import { Loading, ErrorMessage, GallerySkeleton } from '../components'
import { normalizeError, logError } from '../utils'

type LayoutType = 'masonry' | 'grid'

export const GalleryPage = () => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [layout, setLayout] = useState<LayoutType>('masonry')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetchPhotos()
        
        if (response.success) {
          // 新着順でソート（uploadTimeUnixの降順）
          const sortedPhotos = response.photos.sort((a, b) => b.uploadTimeUnix - a.uploadTimeUnix)
          setPhotos(sortedPhotos)
          
          // 画像読み込み状態管理を削除してチラつきを防止
        } else {
          const error = response.error || { code: 'FETCH_ERROR', message: '画像の取得に失敗しました' }
          setError(error)
          logError(normalizeError(error), 'loadPhotos')
        }
      } catch (err) {
        const normalizedError = normalizeError(err)
        logError(normalizedError, 'loadPhotos')
        setError(normalizedError)
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [])

  // 画像クリックハンドラー
  const handleImageClick = (photo: Photo) => {
    setSelectedPhoto(photo)
  }

  // 詳細表示を閉じる
  const handleCloseDetail = () => {
    setSelectedPhoto(null)
  }

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

  // リトライハンドラー
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    // ページをリロードして再取得
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          画像ギャラリー
        </h1>
        <GallerySkeleton layout={layout} count={12} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          画像ギャラリー
        </h1>
        <ErrorMessage 
          error={error}
          showRetry={true}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          画像ギャラリー
        </h1>
        <div className="text-center py-12" data-testid="empty-message">
          <div className="text-gray-500 text-lg mb-4">
            📷
          </div>
          <p className="text-gray-600 text-lg">
            まだ画像がありません
          </p>
          <p className="text-gray-500 text-sm mt-2">
            最初の思い出を投稿してみませんか？
          </p>
        </div>
      </div>
    )
  }

  // レイアウト切り替えハンドラー
  const toggleLayout = () => {
    setLayout(prev => prev === 'masonry' ? 'grid' : 'masonry')
  }

  // 写真カードコンポーネント
  const PhotoCard = ({ photo, isMasonry = false }: { photo: Photo; isMasonry?: boolean }) => {
    if (isMasonry) {
      // マソンリー用コンパクトカード
      return (
        <div 
          className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer" 
          data-testid="photo-item"
          onClick={() => handleImageClick(photo)}
        >
          {/* 画像表示 */}
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
            
            {/* ホバー時のオーバーレイ */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="text-white text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm">詳細を見る</div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // グリッド用通常カード
    return (
      <div 
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer" 
        data-testid="photo-item"
        onClick={() => handleImageClick(photo)}
      >
        {/* 画像表示 */}
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

        {/* メタデータ表示 */}
        <div className="p-3" data-testid="photo-metadata">
          <div className="text-sm font-medium text-gray-800 mb-1" data-testid="uploader-name">
            {photo.uploaderName || '匿名'}
          </div>
          
          {photo.comment && (
            <div className="text-sm text-gray-600 mb-2 line-clamp-2" data-testid="comment">
              {photo.comment}
            </div>
          )}
          
          <div className="text-xs text-gray-500" data-testid="upload-time" data-timestamp={photo.uploadTimeUnix}>
            {new Date(photo.uploadTime).toLocaleString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        思い出ギャラリー
      </h1>
      
      {/* ヘッダー情報とレイアウト切り替えボタン */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
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
            data-testid="masonry-button"
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
            data-testid="grid-button"
          >
            🔲 グリッド
          </button>
        </div>
      </div>

      {/* レイアウト別表示 */}
      {layout === 'masonry' ? (
        /* マソンリーレイアウト - コンパクト表示 */
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2" data-testid="gallery-container">
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid mb-2">
              <PhotoCard photo={photo} isMasonry={true} />
            </div>
          ))}
        </div>
      ) : (
        /* カードグリッドレイアウト（統一サイズ） */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="gallery-container">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} isMasonry={false} />
          ))}
        </div>
      )}

      {/* 画像詳細モーダル */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={handleCloseDetail}>
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row">
              {/* 画像表示 */}
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
              
              {/* 詳細情報 */}
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
                  {/* 投稿者 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">投稿者</label>
                    <div className="text-lg text-gray-900">{selectedPhoto.uploaderName || '匿名'}</div>
                  </div>
                  
                  {/* コメント */}
                  {selectedPhoto.comment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
                      <div className="text-gray-900 whitespace-pre-wrap break-words">
                        {selectedPhoto.comment}
                      </div>
                    </div>
                  )}
                  
                  {/* 投稿日時 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">投稿日時</label>
                    <div className="text-gray-900">
                      {new Date(selectedPhoto.uploadTime).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {/* 画像ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">画像ID</label>
                    <div className="text-sm text-gray-600 font-mono break-all">
                      {selectedPhoto.id}
                    </div>
                  </div>
                </div>
                
                {/* 閉じるボタン */}
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
  )
}