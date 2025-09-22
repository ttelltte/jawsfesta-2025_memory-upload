import React from 'react'

interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'card'
  width?: string | number
  height?: string | number
  lines?: number
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded'
      case 'card':
        return 'rounded-lg'
      default:
        return 'rounded'
    }
  }

  const getStyle = () => {
    const style: React.CSSProperties = {}
    if (width) style.width = typeof width === 'number' ? `${width}px` : width
    if (height) style.height = typeof height === 'number' ? `${height}px` : height
    return style
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            } ${index > 0 ? 'mt-2' : ''}`}
            style={getStyle()}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getStyle()}
    />
  )
}

// 画像ギャラリー用のスケルトン
export const PhotoCardSkeleton: React.FC<{ isMasonry?: boolean }> = ({ 
  isMasonry = false 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 画像部分のスケルトン */}
      <SkeletonLoader
        variant="rectangular"
        className={isMasonry ? 'w-full h-48' : 'w-full aspect-square'}
      />
      
      {/* メタデータ部分のスケルトン */}
      <div className="p-3 space-y-2">
        {/* 投稿者名 */}
        <SkeletonLoader variant="text" width="60%" height={16} />
        
        {/* コメント（2行） */}
        <SkeletonLoader variant="text" lines={2} height={14} />
        
        {/* 投稿日時 */}
        <SkeletonLoader variant="text" width="40%" height={12} />
      </div>
    </div>
  )
}

// ギャラリー全体のスケルトン
export const GallerySkeleton: React.FC<{ 
  layout: 'masonry' | 'grid'
  count?: number 
}> = ({ 
  layout, 
  count = 12 
}) => {
  if (layout === 'masonry') {
    return (
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="break-inside-avoid mb-4">
            <PhotoCardSkeleton isMasonry={true} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <PhotoCardSkeleton key={index} isMasonry={false} />
      ))}
    </div>
  )
}

// アップロードフォーム用のスケルトン
export const UploadFormSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* タイトル */}
      <SkeletonLoader variant="text" width="200px" height={32} className="mx-auto" />
      
      {/* アップロードエリア */}
      <SkeletonLoader variant="rectangular" height={200} className="border-2 border-dashed border-gray-300" />
      
      {/* フォームフィールド */}
      <div className="space-y-4">
        <div>
          <SkeletonLoader variant="text" width="80px" height={16} className="mb-2" />
          <SkeletonLoader variant="rectangular" height={40} />
        </div>
        <div>
          <SkeletonLoader variant="text" width="100px" height={16} className="mb-2" />
          <SkeletonLoader variant="rectangular" height={80} />
        </div>
      </div>
      
      {/* チェックリスト */}
      <div className="space-y-3">
        <SkeletonLoader variant="text" width="120px" height={16} />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start space-x-3">
            <SkeletonLoader variant="rectangular" width={16} height={16} className="mt-1" />
            <SkeletonLoader variant="text" width="80%" height={16} />
          </div>
        ))}
      </div>
      
      {/* ボタン */}
      <SkeletonLoader variant="rectangular" height={48} width="200px" className="mx-auto" />
    </div>
  )
}