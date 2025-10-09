/**
 * ユーザー名をlocalStorageで管理するユーティリティ
 * 7日間の有効期限付きで名前を保存・取得・削除する
 */

const STORAGE_KEY = 'jaws-festa-uploader-name';
const EXPIRY_DAYS = 7;

interface StoredUserName {
  name: string;
  savedAt: number;
  expiresAt: number;
}

/**
 * ユーザー名をlocalStorageに保存する
 * @param name - 保存するユーザー名
 */
export const saveUserName = (name: string): void => {
  if (!name || name.trim() === '') {
    return;
  }

  const now = Date.now();
  const expiresAt = now + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const data: StoredUserName = {
    name: name.trim(),
    savedAt: now,
    expiresAt,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save user name to localStorage:', error);
  }
};

/**
 * localStorageからユーザー名を取得する
 * 期限切れの場合は自動的に削除してnullを返す
 * @returns 保存されたユーザー名、または null
 */
export const getUserName = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data: StoredUserName = JSON.parse(stored);

    // 期限チェック
    if (Date.now() > data.expiresAt) {
      clearUserName();
      return null;
    }

    return data.name;
  } catch (error) {
    console.error('Failed to get user name from localStorage:', error);
    clearUserName();
    return null;
  }
};

/**
 * localStorageからユーザー名を削除する
 */
export const clearUserName = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user name from localStorage:', error);
  }
};

/**
 * 保存されたユーザー名が存在するかチェックする
 * @returns ユーザー名が保存されている場合true
 */
export const hasStoredUserName = (): boolean => {
  return getUserName() !== null;
};
