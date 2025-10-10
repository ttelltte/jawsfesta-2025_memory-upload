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

  // 外部からファイルが選択された場合のプレビュー更新
  useEffect(() => {
    if (selectedImage && !previewUrl) {
      const url = URL.createObjectURL(selectedImage)
      setPreviewUrl(url)
    } else if (!selectedImage && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [selectedImage, previewUrl])

  // ファイル選択処理
  const handleFileSelect = useCallback((file: File) => {
    // ファイルバリデーション（20MB超えは受け付けない）
    const validation = validateFile(file, {
      maxSizeInMB: 20, // 20MB超えはエラー
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

      {/* プレビュー表示 - コンパクト */}
      {previewUrl && selectedImage && (
        <div className="relative bg-white rounded-lg shadow-md p-3" data-testid="image-preview">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-800">選択された画像</h3>
            <button
              onClick={handleRemovePreview}
              className="text-red-500 hover:text-red-700 text-xs font-medium"
            >
              削除
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {/* 画像プレビューエリア - コンパクト */}
            <div className="flex justify-center">
              <div className="relative">
                <div 
                  className="overflow-hidden rounded border bg-gray-50 flex items-center justify-center"
                  style={{
                    width: '200px',
                    height: '200px'
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

            {/* 回転コントロール - コンパクト */}
            <div className="flex gap-1 justify-center">
              <button
                onClick={handleImageRotate}
                className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1"
              >
                <i className="fas fa-redo"></i>
                回転
              </button>
              {imageRotation !== 0 && (
                <>
                  <button
                    onClick={handleImageReset}
                    className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    <i className="fas fa-undo"></i>
                    リセット
                  </button>
                  <button
                    onClick={handleApplyRotation}
                    className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1"
                  >
                    <i className="fas fa-check"></i>
                    適用
                  </button>
                </>
              )}
            </div>

            {/* ファイル情報 - コンパクト */}
            <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
              <div className="space-y-1">
                <p><span className="font-medium">ファイル:</span> {selectedImage.name.length > 20 ? `${selectedImage.name.substring(0, 20)}...` : selectedImage.name}</p>
                <p><span className="font-medium">サイズ:</span> {formatFileSize(selectedImage.size)}</p>
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
        <div className="text-center">
          <div className="space-y-4">
            {/* ボタン群 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleFileButtonClick}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
                data-testid="upload-button"
              >
                <i className={`fas ${isMobile ? 'fa-camera' : 'fa-image'}`}></i>
                {isMobile ? '撮影・画像選択' : '画像を選択'}
              </button>
            </div>

            {/* ファイル制限の簡潔な説明 */}
            <div className="text-xs text-gray-400">
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