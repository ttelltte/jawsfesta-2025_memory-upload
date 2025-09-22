// Config API クライアント

export interface ChecklistItem {
  id: string
  text: string
  required: boolean
}

export interface ConfigResponse {
  success: boolean
  data?: {
    confirmationItems: ChecklistItem[]
    lastUpdated: string
    version: string
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * 確認項目設定を取得する
 */
export const fetchChecklistConfig = async (): Promise<ChecklistItem[]> => {
  try {
    // 環境変数からAPI URLを取得
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/config`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: ConfigResponse = await response.json()
    
    if (!data.success || !data.data) {
      throw new Error(data.error?.message || '設定の取得に失敗しました')
    }
    
    return data.data.confirmationItems
  } catch (error) {
    console.error('確認項目設定の取得に失敗:', error)
    
    // フォールバック: デフォルトの確認項目を返す
    return [
      {
        id: 'event_participant',
        text: 'イベント参加者であることを確認しました',
        required: true
      },
      {
        id: 'appropriate_content',
        text: 'JAWS-UG行動規範に沿った内容であることを確認しました',
        required: true
      },
      {
        id: 'public_sharing',
        text: '写真がパブリックに公開されることを理解しました',
        required: true
      },
      {
        id: 'auto_deletion',
        text: '30日後に自動的に削除されることを理解しました',
        required: true
      }
    ]
  }
}