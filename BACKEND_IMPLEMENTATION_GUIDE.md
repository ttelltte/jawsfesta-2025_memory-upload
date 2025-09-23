# 管理者機能バックエンド実装ガイド

## 概要
フロントエンドの管理者機能に対応するバックエンドAPIを実装する必要があります。

## 必要なAPI エンドポイント

### 1. 画像削除API
```
DELETE /api/admin/photos/{photoId}
```

**機能**: 指定された画像をS3とDynamoDBから削除

**レスポンス例**:
```json
{
  "success": true,
  "message": "画像が削除されました"
}
```

**エラーレスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "画像が見つかりません"
  }
}
```

### 2. 画像情報更新API
```
PATCH /api/admin/photos/{photoId}
```

**リクエストボディ例**:
```json
{
  "uploaderName": "新しい投稿者名",
  "comment": "新しいコメント",
  "rotation": 90
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "id": "photo-id",
    "uploaderName": "新しい投稿者名",
    "comment": "新しいコメント",
    "uploadTime": "2025-01-23T10:00:00Z",
    "uploadTimeUnix": 1737630000,
    "presignedUrl": "https://..."
  }
}
```

## 実装が必要な機能

### 1. 認証・認可
- 管理者権限の確認（URLパラメータ `admin=19931124` の検証）
- リクエストヘッダーまたはクエリパラメータでの認証

### 2. S3操作
- **画像削除**: S3バケットから画像ファイルを削除
- **画像回転**: 既存画像を回転させて新しいファイルとして保存

### 3. DynamoDB操作
- **メタデータ削除**: 画像削除時にDynamoDBレコードを削除
- **メタデータ更新**: 投稿者名、コメントの更新

### 4. 画像回転処理
- S3から画像をダウンロード
- 指定された角度（90, 180, 270度）で回転
- 回転後の画像をS3に再アップロード
- DynamoDBのメタデータは変更不要

## 技術仕様

### 使用技術スタック
- **言語**: TypeScript/JavaScript (Node.js)
- **フレームワーク**: AWS Lambda + API Gateway
- **データベース**: DynamoDB
- **ストレージ**: S3
- **画像処理**: Sharp または Canvas API

### 環境変数
```
PHOTOS_TABLE_NAME=jawsfestamemoryuploaddev-photostable...
PHOTOS_BUCKET_NAME=jawsfestamemoryuploaddev-photosbucket...
ADMIN_PASSWORD=19931124
```

### DynamoDBテーブル構造
```
PrimaryKey: id (String)
Attributes:
- uploaderName (String)
- comment (String)
- uploadTime (String)
- uploadTimeUnix (Number)
- fileName (String)
- fileSize (Number)
- contentType (String)
```

### S3バケット構造
```
images/
  ├── {photo-id}.jpg
  ├── {photo-id}.png
  └── ...
```

## 実装手順

### Step 1: Lambda関数の作成
1. `backend/src/handlers/admin/` ディレクトリを作成
2. `deletePhoto.ts` - 画像削除ハンドラー
3. `updatePhoto.ts` - 画像更新ハンドラー

### Step 2: 認証ミドルウェア
```typescript
export const validateAdmin = (event: APIGatewayProxyEvent) => {
  const adminParam = event.queryStringParameters?.admin
  if (adminParam !== process.env.ADMIN_PASSWORD) {
    throw new Error('Unauthorized')
  }
}
```

### Step 3: 画像削除実装
```typescript
export const deletePhotoHandler = async (event: APIGatewayProxyEvent) => {
  try {
    validateAdmin(event)
    
    const photoId = event.pathParameters?.photoId
    
    // DynamoDBから画像情報を取得
    const photoData = await getPhotoFromDB(photoId)
    
    // S3から画像を削除
    await deleteFromS3(photoData.fileName)
    
    // DynamoDBからレコードを削除
    await deleteFromDB(photoId)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '画像が削除されました'
      })
    }
  } catch (error) {
    return handleError(error)
  }
}
```

### Step 4: 画像更新実装
```typescript
export const updatePhotoHandler = async (event: APIGatewayProxyEvent) => {
  try {
    validateAdmin(event)
    
    const photoId = event.pathParameters?.photoId
    const updates = JSON.parse(event.body || '{}')
    
    // 画像回転が必要な場合
    if (updates.rotation) {
      await rotateImage(photoId, updates.rotation)
    }
    
    // メタデータ更新
    const updatedPhoto = await updatePhotoMetadata(photoId, updates)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: updatedPhoto
      })
    }
  } catch (error) {
    return handleError(error)
  }
}
```

### Step 5: 画像回転実装
```typescript
import sharp from 'sharp'

export const rotateImage = async (photoId: string, rotation: number) => {
  // S3から画像をダウンロード
  const imageBuffer = await downloadFromS3(photoId)
  
  // 画像を回転
  const rotatedBuffer = await sharp(imageBuffer)
    .rotate(rotation)
    .toBuffer()
  
  // 回転後の画像をS3にアップロード
  await uploadToS3(photoId, rotatedBuffer)
}
```

### Step 6: CDK/CloudFormationの更新
```typescript
// API Gateway にルートを追加
api.addRoutes({
  'DELETE /admin/photos/{photoId}': {
    integration: new LambdaIntegration(deletePhotoFunction)
  },
  'PATCH /admin/photos/{photoId}': {
    integration: new LambdaIntegration(updatePhotoFunction)
  }
})

// Lambda関数にS3とDynamoDBの権限を付与
deletePhotoFunction.addToRolePolicy(new PolicyStatement({
  actions: ['s3:DeleteObject', 'dynamodb:DeleteItem', 'dynamodb:GetItem'],
  resources: [bucket.bucketArn + '/*', table.tableArn]
}))
```

## セキュリティ考慮事項

### 1. 認証
- 管理者パスワードの環境変数化
- リクエスト毎の認証チェック

### 2. 入力検証
- photoIdの形式チェック
- 更新データのバリデーション
- SQLインジェクション対策（DynamoDBでは不要だが念のため）

### 3. エラーハンドリング
- 詳細なエラー情報の非表示
- ログ記録（CloudWatch）
- 適切なHTTPステータスコード

### 4. CORS設定
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Methods': 'DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

## テスト方法

### 1. 単体テスト
```bash
npm test -- --testPathPattern=admin
```

### 2. 統合テスト
```bash
# 画像削除テスト
curl -X DELETE "https://api-url/admin/photos/test-id?admin=19931124"

# 画像更新テスト
curl -X PATCH "https://api-url/admin/photos/test-id?admin=19931124" \
  -H "Content-Type: application/json" \
  -d '{"uploaderName": "テストユーザー", "rotation": 90}'
```

### 3. フロントエンド連携テスト
1. 管理者モードでアクセス (`?admin=19931124`)
2. 画像の歯車ボタンをクリック
3. 編集ダイアログで各種操作を実行
4. ブラウザの開発者ツールでネットワークタブを確認

## デプロイ手順

### 1. バックエンドのビルド
```bash
npm run build:backend
```

### 2. インフラのデプロイ
```bash
npm run deploy:dev
```

### 3. 動作確認
```bash
npm run test:admin-api
```

## 注意事項

1. **画像回転は重い処理**: Lambda のタイムアウト設定を適切に（30秒程度）
2. **S3権限**: 既存の画像に対する削除・更新権限が必要
3. **DynamoDB権限**: GetItem, UpdateItem, DeleteItem権限が必要
4. **エラーログ**: CloudWatchでエラーを監視
5. **バックアップ**: 削除前のデータバックアップ機能（オプション）

## 実装優先度

### 高優先度
1. 画像削除API（DELETE）
2. メタデータ更新API（PATCH）- 回転以外
3. 認証機能

### 中優先度
1. 画像回転機能
2. エラーハンドリングの改善

### 低優先度
1. 削除前バックアップ
2. 操作ログ記録
3. 管理者操作の監査ログ

この実装ガイドに従って、管理者機能のバックエンドAPIを実装してください。