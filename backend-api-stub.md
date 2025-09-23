# 管理者機能用バックエンドAPI仕様

## 1. 画像削除API

```
DELETE /admin/photos/{photoId}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "画像が削除されました"
}
```

## 2. 画像情報更新API

```
PATCH /admin/photos/{photoId}
```

**リクエストボディ:**
```json
{
  "uploaderName": "新しい投稿者名",
  "comment": "新しいコメント",
  "rotation": 90
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "photo-id",
    "uploaderName": "新しい投稿者名",
    "comment": "新しいコメント",
    "uploadTime": "2025-01-23T10:00:00Z",
    "presignedUrl": "https://..."
  }
}
```

## 実装が必要な機能

1. **認証・認可**: 管理者権限の確認
2. **S3操作**: 画像ファイルの削除
3. **DynamoDB操作**: メタデータの更新・削除
4. **画像回転**: S3の画像を回転して再保存
5. **エラーハンドリング**: 適切なエラーレスポンス

## セキュリティ考慮事項

- 管理者権限の適切な検証
- CORS設定の確認
- ログ記録（削除・更新操作の記録）