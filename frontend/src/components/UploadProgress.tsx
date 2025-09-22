import React from 'react'
import { formatBytes, type UploadProgress as UploadProgressType } from '../api/upload'

interface UploadProgressProps {
  progress: UploadProgressType
  fileName: string
  isUploading: boolean
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  isUploading
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="upload-progress">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-blue-800">
          {isUploading ? 'アップロード中...' : 'アップロード完了'}
        </h3>
        <span className="text-sm text-blue-600 font-medium">
          {progress.percentage}%
        </span>
      </div>
      
      {/* プログレスバー */}
      <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      {/* ファイル情報 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-blue-700 space-y-1 sm:space-y-0">
        <span className="truncate font-medium">{fileName}</span>
        <span>
          {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
        </span>
      </div>
      
      {/* アップロード中のアニメーション */}
      {isUploading && (
        <div className="flex items-center mt-2 text-xs text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
          <span>画像をアップロードしています...</span>
        </div>
      )}
    </div>
  )
}