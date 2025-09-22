import { useState, useEffect } from 'react'
import { fetchPhotos, Photo } from '../api/photos'
import { Loading, ErrorMessage } from '../components'

type LayoutType = 'masonry' | 'grid'

export const GalleryPage = () => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutType>('masonry')

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
        } else {
          setError(response.error?.message || '画像の取得に失敗しました')
        }
      } catch (err) {
        setError('画像の取得中にエラーが発生しました')
        console.error('画像取得エラー:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPhotos()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          画像ギャラリー
        </h1>
        <ErrorMessage message={error} />
        <div className="text-center mt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          画像ギャラリー
        </h1>
        <div className="text-center py-12">
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
  const PhotoCard = ({ photo, isMasonry = false }: { photo: Photo; isMasonry?: boolean }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* 画像表示 */}
      <div className={`bg-gray-100 relative ${isMasonry ? 'aspect-auto' : 'aspect-square'}`}>
        {photo.presignedUrl ? (
          <img
            src={photo.presignedUrl}
            alt={photo.comment || '投稿画像'}
            className={`w-full ${isMasonry ? 'h-auto' : 'h-full'} object-cover`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuOCqOODqeODvDwvdGV4dD48L3N2Zz4='
            }}
          />
        ) : (
          <div className={`w-full ${isMasonry ? 'h-48' : 'h-full'} flex items-center justify-center text-gray-400`}>
            <div className="text-center">
              <div className="text-2xl mb-2">📷</div>
              <div className="text-sm">読み込み中...</div>
            </div>
          </div>
        )}
      </div>

      {/* メタデータ表示 */}
      <div className="p-3">
        <div className="text-sm font-medium text-gray-800 mb-1">
          {photo.uploaderName || '匿名'}
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
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        画像ギャラリー
      </h1>
      
      {/* ヘッダー情報とレイアウト切り替えボタン */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-gray-600">
          {photos.length}枚の思い出
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">表示:</span>
          <button
            onClick={toggleLayout}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              layout === 'masonry'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📱 マソンリー
          </button>
          <button
            onClick={toggleLayout}
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

      {/* レイアウト別表示 */}
      {layout === 'masonry' ? (
        /* マソンリーレイアウト */
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid mb-4">
              <PhotoCard photo={photo} isMasonry={true} />
            </div>
          ))}
        </div>
      ) : (
        /* カードグリッドレイアウト（統一サイズ） */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} isMasonry={false} />
          ))}
        </div>
      )}
    </div>
  )
}