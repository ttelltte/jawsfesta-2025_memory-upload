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
  maxSizeMB: 2, // 2MBまで圧縮
  maxWidthOrHeight: 3200, // 3K解像度
  useWebWorker: true, // バックグラウンドで処理
  quality: 0.75, // 品質75%
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
    const fileSizeMB = file.size / 1024 / 1024

    // 品質と解像度で圧縮（目標サイズは使わない）
    let quality = 0.75
    let maxDimension = 3200

    // 10MB以上はさらに積極的に
    if (fileSizeMB > 10) {
      quality = 0.7
      maxDimension = 2560
    }

    // 圧縮実行（maxSizeMBを指定しない）
    const compressedFile = await imageCompression(file, {
      maxWidthOrHeight: maxDimension,
      useWebWorker: true,
      initialQuality: quality,
    })

    // 圧縮後のサイズが元より大きい場合は元のファイルを返す
    if (compressedFile.size >= file.size) {
      return file
    }

    return compressedFile
  } catch (error) {
    // エラー時は元のファイルを返す
    return file
  }
}

/**
 * 圧縮が必要かどうかを判定
 * @param file ファイル
 * @param thresholdMB 閾値（MB）デフォルトは0.5MB
 * @returns 圧縮が必要な場合true
 */
export const shouldCompress = (file: File, thresholdMB: number = 0.5): boolean => {
  const fileSizeMB = file.size / 1024 / 1024
  return fileSizeMB > thresholdMB
}


