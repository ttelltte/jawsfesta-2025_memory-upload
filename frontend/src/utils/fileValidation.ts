export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface ValidationOptions {
  maxSizeInMB?: number
  allowedTypes?: string[]
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  maxSizeInMB: 10,
  allowedTypes: ['image/*']
}

/**
 * ファイルサイズのバリデーション
 */
export const validateFileSize = (file: File, maxSizeInMB: number): ValidationResult => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: `ファイルサイズは${maxSizeInMB}MB以下にしてください（現在: ${(file.size / 1024 / 1024).toFixed(2)}MB）`
    }
  }
  
  return { isValid: true }
}

/**
 * ファイル形式のバリデーション
 */
export const validateFileType = (file: File, allowedTypes: string[]): ValidationResult => {
  // MIMEタイプのチェック
  const isValidMimeType = allowedTypes.some(type => {
    if (type === 'image/*') {
      return file.type.startsWith('image/')
    }
    return file.type === type
  })
  
  if (!isValidMimeType) {
    return {
      isValid: false,
      error: `対応していないファイル形式です。画像ファイル（JPEG, PNG, WebP, HEIC, BMP, GIF等）を選択してください（現在: ${file.type || '不明'}）`
    }
  }
  
  // 追加の拡張子チェック（MIMEタイプが不正確な場合のフォールバック）
  const fileName = file.name.toLowerCase()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.gif', '.tiff', '.tif', '.svg']
  const hasValidExtension = imageExtensions.some(ext => fileName.endsWith(ext))
  
  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `対応していないファイル拡張子です。画像ファイル（.jpg, .png, .webp, .heic等）を選択してください`
    }
  }
  
  return { isValid: true }
}

/**
 * 包括的なファイルバリデーション
 */
export const validateFile = (file: File, options: ValidationOptions = {}): ValidationResult => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // ファイルサイズのチェック
  const sizeValidation = validateFileSize(file, opts.maxSizeInMB)
  if (!sizeValidation.isValid) {
    return sizeValidation
  }
  
  // ファイル形式のチェック
  const typeValidation = validateFileType(file, opts.allowedTypes)
  if (!typeValidation.isValid) {
    return typeValidation
  }
  
  return { isValid: true }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * ファイル形式を人間が読みやすい形式に変換
 */
export const getFileTypeDescription = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG画像',
    'image/jpg': 'JPEG画像',
    'image/png': 'PNG画像',
    'image/webp': 'WebP画像',
    'image/heic': 'HEIC画像',
    'image/heif': 'HEIF画像',
    'image/bmp': 'BMP画像',
    'image/gif': 'GIF画像',
    'image/tiff': 'TIFF画像',
    'image/svg+xml': 'SVG画像'
  }
  
  return typeMap[mimeType] || mimeType || '不明な形式'
}