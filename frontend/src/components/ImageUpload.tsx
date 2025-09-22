import React, { useState, useRef, useCallback } from 'react'
import { ErrorMessage } from './ErrorMessage'
import { validateFile, formatFileSize, getFileTypeDescription } from '../utils'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  selectedImage: File | null
  error: string | null
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  selectedImage,
  error
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ファイル選択処理
  const handleFileSelect = useCallback((file: File) => {
    // ファイルバリデーション
    const validation = validateFile(file, {
      maxSizeInMB: 10,
      allowedTypes: ['image/*']
    })
    
    if (!validation.isValid) {
      onImageSelect(null as any) // エラー時は選択をクリア
      return // エラーは親コンポーネントで処理される
    }
    
    onImageSelect(file)
    
    // プレビュー用のURLを生成
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [onImageSelect])

  // ファイル入力の変更処理
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // ドラッグ&ドロップ処理
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // ファイル選択ボタンクリック
  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  // カメラ撮影ボタンクリック（モバイル対応）
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment')
      fileInputRef.current.click()
    }
  }

  // プレビュー削除
  const handleRemovePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onImageSelect(null as any) // 選択をクリア
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* エラーメッセージ */}
      {error && <ErrorMessage message={error} type="error" />}

      {/* プレビュー表示 */}
      {previewUrl && selectedImage && (
        <div className="relative bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium text-gray-800">選択された画像</h3>
            <button
              onClick={handleRemovePreview}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              削除
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <img
                src={previewUrl}
                alt="プレビュー"
                className="w-full sm:w-48 h-48 object-cover rounded-lg border"
              />
            </div>
            <div className="flex-1 space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">ファイル名:</span> {selectedImage.name}</p>
              <p><span className="font-medium">サイズ:</span> {formatFileSize(selectedImage.size)}</p>
              <p><span className="font-medium">形式:</span> {getFileTypeDescription(selectedImage.type)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ファイル選択エリア */}
      {!selectedImage && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            {/* アイコン */}
            <div className="mx-auto w-16 h-16 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* メッセージ */}
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                画像をアップロード
              </p>
              <p className="text-sm text-gray-500 mb-4">
                ファイルをドラッグ&ドロップするか、下のボタンから選択してください
              </p>
            </div>

            {/* ボタン群 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleFileButtonClick}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                📁 ファイルを選択
              </button>
              
              <button
                onClick={handleCameraClick}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium sm:hidden"
              >
                📷 カメラで撮影
              </button>
            </div>

            {/* 対応形式の説明 */}
            <div className="text-xs text-gray-400 mt-4 space-y-1">
              <p>対応形式: JPEG, PNG, WebP, HEIC, BMP, GIF など</p>
              <p>最大ファイルサイズ: 10MB</p>
              <p>推奨: スマートフォンで撮影した写真やスクリーンショット</p>
            </div>
          </div>
        </div>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
}