# 本番環境画像表示問題 修正内容

## 🐛 発見された問題

1. **画像表示問題**: フロントエンドで `presignedUrl` が存在しない場合に「画像なし」と表示
2. **投稿者名問題**: バックエンドで `uploaderName` が空の場合に「Anonymous」と表示
3. **時刻表示問題**: UTC時刻が日本時間として表示されている
4. **Lambda関数の不整合**: infrastructure/lambda/ のコードが古く、フロントエンドが期待するレスポンス形式と異なる

## 🔧 修正内容

### 1. 時刻表示の修正（UTC → JST）

**ファイル**: `frontend/src/pages/GalleryPage.tsx`

```javascript
// 修正前
{new Date(photo.uploadTime).toLocaleString('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

// 修正後
{new Date(photo.uploadTime).toLocaleString('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tokyo'  // 追加
})}
```

### 2. 投稿者名の表示修正

**ファイル**: `frontend/src/pages/GalleryPage.tsx`

```javascript
// 修正前
{photo.uploaderName || '匿名'}

// 修正後
{photo.uploaderName && photo.uploaderName !== 'Anonymous' ? photo.uploaderName : '匿名'}
```

### 3. Lambda関数の更新

**更新ファイル**:
- `infrastructure/lambda/upload/index.js`
- `infrastructure/lambda/list/index.js`
- `infrastructure/lambda/config/index.js`

**主な変更点**:
- AWS SDK v3への統一
- レスポンス形式の統一（`presignedUrl`フィールドの使用）
- エラーハンドリングの改善

### 4. デバッグスクリプトの追加

**新規ファイル**: `infrastructure/scripts/debug-production.js`

本番環境の問題を診断するためのスクリプト：
- DynamoDBテーブルの確認
- S3バケットの確認
- 画像データの整合性確認
- Presigned URL生成テスト

## 🚀 デプロイ手順

### 1. フロントエンドの更新
```bash
cd frontend
npm run build
cd ../infrastructure
npm run deploy-frontend:prod
npm run cloudfront:invalidate
```

### 2. バックエンドの更新
```bash
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

### 3. 動作確認
```bash
# デバッグスクリプト実行
cd infrastructure
node scripts/debug-production.js

# API動作確認
curl https://your-api-gateway-url/api/photos
```

## 🔍 確認ポイント

### 1. 時刻表示
- 投稿時刻が日本時間（JST）で表示されることを確認
- 詳細モーダルでも正しい時刻が表示されることを確認

### 2. 投稿者名
- 投稿者名が入力されている場合は正しく表示
- 投稿者名が空の場合は「匿名」と表示
- 「Anonymous」は「匿名」として表示

### 3. 画像表示
- S3にアップロードされた画像が正しく表示される
- Presigned URLが正常に生成される
- 画像読み込みエラーが発生しない

## 🚨 注意事項

### 1. キャッシュ無効化
フロントエンドの変更後は必ずCloudFrontのキャッシュを無効化する

### 2. 環境変数
本番環境のLambda関数で以下の環境変数が正しく設定されていることを確認：
- `PHOTOS_TABLE_NAME`
- `CONFIG_TABLE_NAME`
- `PHOTOS_BUCKET_NAME`
- `AWS_REGION`

### 3. 権限設定
Lambda関数がS3とDynamoDBに適切にアクセスできることを確認

## 📊 期待される結果

修正後の期待される動作：

1. **画像表示**: S3にアップロードされた画像が正常に表示される
2. **投稿者名**: 「Anonymous」が「匿名」として表示される
3. **時刻表示**: UTC時刻が日本時間（JST）として正しく表示される
4. **エラー処理**: 画像読み込みエラーが適切にハンドリングされる

## 🔄 ロールバック手順

問題が発生した場合のロールバック：

```bash
# 前のバージョンのLambda関数にロールバック
cd infrastructure
git checkout HEAD~1 -- lambda/
npx cdk deploy --require-approval never

# 前のバージョンのフロントエンドにロールバック
git checkout HEAD~1 -- frontend/src/pages/GalleryPage.tsx
cd frontend && npm run build && cd ../infrastructure
npm run deploy-frontend:prod
npm run cloudfront:invalidate
```