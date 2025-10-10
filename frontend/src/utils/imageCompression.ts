import imageCompression from 'browser-image-compression'

/**
 * 画像圧縮オプション
 */
export interface CompressionOptions {
  maxSizeMB: number // 最大ファイルサイズ（MB）
  maxWidthOrHeight?: number // 最大幅または高さ（ピクセル）
  useWebWorker?: boolean // Web Workerを使用するか
  quality?: number // 品質（0-1）
}

/**
 * デフォルト圧縮オプション
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 5, // 5MBまで圧縮（Base64エンコード後も7MB程度）
  maxWidthOrHeight: 3840, // 4K解像度対応
  useWebWorker: true, // バックグラウンドで処理
  quality: 0.85, // バランスの良い品質（85%）
}

/**
 * 画像を圧縮する
 * @param file 元の画像ファイル
 * @param options 圧縮オプション
 * @returns 圧縮された画像ファイル
 */
export const compressImage = async (
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> => {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const fileSizeMB = file.size / 1024 / 1024

    // 非常に大きなファイル（10MB以上）の場合、より積極的に圧縮
    if (fileSizeMB > 10) {
      opts.maxSizeMB = 4 // より小さく圧縮
      opts.maxWidthOrHeight = 2560 // 解像度を下げる
      opts.quality = 0.75 // 品質を下げる
    }

    // 圧縮実行
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      initialQuality: opts.quality,
      maxIteration: 20, // 最大反復回数を増やす
    })

    return compressedFile
  } catch (error) {
    // エラー時は元のファイルをそのまま返す（フォールバック）
    return file
  }
}

/**
 * 圧縮が必要かどうかを判定
 * @param file ファイル
 * @param thresholdMB 閾値（MB）デフォルトは1MB
 * @returns 圧縮が必要な場合true
 */
export const shouldCompress = (file: File, thresholdMB: number = 1): boolean => {
  const fileSizeMB = file.size / 1024 / 1024
  return fileSizeMB > thresholdMB
}


