import React, { useState, useRef, useCallback, useEffect } from 'react'
import ErrorMessage from './ErrorMessage'
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
  const [imageRotation, setImageRotation] = useState(0)

  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)


  // モバイルデバイスの判定（シンプルに画面幅で判定）
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640) // スマートフォンサイズのみ
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

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
    resetFileInputState()
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
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // ファイル入力の状態をリセット
  const resetFileInputState = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 画像回転処理
  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360)
  }

  const handleImageReset = () => {
    setImageRotation(0)
  }

  // 回転した画像をFileオブジェクトに変換
  const rotateImageFile = useCallback(async (file: File, rotation: number): Promise<File> => {
    if (rotation === 0) return file

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const { width, height } = img
        
        // 90度または270度回転の場合は幅と高さを入れ替え
        if (rotation === 90 || rotation === 270) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }

        if (ctx) {
          // 回転の中心を設定
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.drawImage(img, -width / 2, -height / 2)
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const rotatedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(rotatedFile)
          }
        }, file.type)
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  // プレビュー削除
  const handleRemovePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setImageRotation(0)
    onImageSelect(null as any) // 選択をクリア
    resetFileInputState() // ファイル入力の状態をリセット
  }

  // 回転適用処理
  const handleApplyRotation = async () => {
    if (selectedImage && imageRotation !== 0) {
      // 回転を0にしてからファイル処理を行う（アニメーション防止）
      const currentRotation = imageRotation
      setImageRotation(0)
      
      const rotatedFile = await rotateImageFile(selectedImage, currentRotation)
      onImageSelect(rotatedFile)
      
      // 新しいプレビューURLを生成
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const newUrl = URL.createObjectURL(rotatedFile)
      setPreviewUrl(newUrl)
    }
  }

  return (
    <div className="space-y-4" data-testid="upload-area">
      {/* エラーメッセージ */}
      {error && <ErrorMessage message={error} type="error" />}

      {/* プレビュー表示 */}
      {previewUrl && selectedImage && (
        <div className="relative bg-white rounded-lg shadow-md p-4" data-testid="image-preview">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium text-gray-800">選択された画像</h3>
            <button
              onClick={handleRemovePreview}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              削除
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {/* 画像プレビューエリア */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="overflow-hidden rounded-lg border bg-gray-50 flex items-center justify-center"
                  style={{
                    width: '300px',
                    height: '300px'
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="プレビュー"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `rotate(${imageRotation}deg)`,
                      transition: imageRotation === 0 ? 'none' : 'transform 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 回転コントロール */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleImageRotate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-redo"></i>
                回転
              </button>
              {imageRotation !== 0 && (
                <>
                  <button
                    onClick={handleImageReset}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-undo"></i>
                    リセット
                  </button>
                  <button
                    onClick={handleApplyRotation}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-check"></i>
                    適用
                  </button>
                </>
              )}
            </div>

            {/* ファイル情報 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                <p><span className="font-medium">ファイル名:</span> {selectedImage.name}</p>
                <p><span className="font-medium">サイズ:</span> {formatFileSize(selectedImage.size)}</p>
                <p><span className="font-medium">形式:</span> {getFileTypeDescription(selectedImage.type)}</p>
                {imageRotation !== 0 && (
                  <p><span className="font-medium text-blue-600">回転:</span> <span className="text-blue-600 font-medium">{imageRotation}度</span></p>
                )}
              </div>
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
            <div className="mx-auto text-gray-400">
              <i className="fas fa-cloud-upload-alt text-5xl sm:text-6xl"></i>
            </div>

            {/* メッセージ */}
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                画像をアップロード
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {isMobile 
                  ? 'ボタンから撮影または画像を選択してください'
                  : 'ファイルをドラッグ&ドロップするか、下のボタンから選択してください'
                }
              </p>
            </div>

            {/* ボタン群 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleFileButtonClick}
                className={`${isMobile
                  ? 'w-full px-6 py-3 text-lg'
                  : 'px-6 py-2'
                  } bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2`}
                data-testid="upload-button"
              >
                <i className={`fas ${isMobile ? 'fa-camera' : 'fa-cloud-upload-alt'}`}></i>
                {isMobile ? '撮影・画像選択' : '画像をアップロード'}
              </button>
            </div>

            {/* ファイル制限の簡潔な説明 */}
            <div className="text-xs text-gray-400 mt-4">
              <p>最大ファイルサイズ: 10MB</p>
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