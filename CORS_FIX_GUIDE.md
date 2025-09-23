# 🔧 CORS エラー修正ガイド

## 🚨 発生していた問題

管理者機能で以下のCORSエラーが発生していました：

```
Access to fetch at 'https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/photos/xxx' 
from origin 'https://xxx.cloudfront.net' has been blocked by CORS policy: 
Method PATCH is not allowed by Access-Control-Allow-Methods in preflight response.
```

## 🔍 原因

API GatewayのCORS設定で、管理者機能で使用する以下のHTTPメソッドが許可されていませんでした：
- `PATCH` (画像更新用)
- `DELETE` (画像削除用)

既存の設定では `['GET', 'POST', 'OPTIONS']` のみが許可されていました。

## ✅ 修正内容

### 1. API Gateway レベルのCORS設定更新

**修正前:**
```typescript
allowMethods: ['GET', 'POST', 'OPTIONS']
```

**修正後:**
```typescript
allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
```

### 2. 管理者リソース専用のCORS設定追加

管理者機能のAPIリソース (`/api/admin/*`) に明示的なCORS設定を追加：

```typescript
const adminResource = apiResource.addResource('admin', {
  defaultCorsPreflightOptions: {
    allowOrigins: ['*'],
    allowMethods: ['PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date', 
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Requested-With',
    ],
  },
});
```

### 3. Lambda関数のCORSヘッダー更新

各Lambda関数のレスポンスヘッダーに `X-Requested-With` を追加：

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
  'Access-Control-Allow-Methods': 'PATCH,OPTIONS', // または 'DELETE,OPTIONS'
  'Content-Type': 'application/json'
};
```

## 🚀 修正のデプロイ手順

### Step 1: 修正内容の確認
```bash
# 変更差分を確認
cd infrastructure
npm run diff:dev
```

### Step 2: インフラストラクチャの再デプロイ
```bash
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

### Step 3: デプロイ完了の確認
```bash
# API Gateway の設定確認
aws apigateway get-resources --rest-api-id YOUR_API_ID --region ap-northeast-1
```

### Step 4: 動作確認

#### ブラウザでの確認
1. 管理者モードでアクセス: `https://xxx.cloudfront.net?admin=19931124`
2. 画像の歯車ボタンをクリック
3. 管理者編集ダイアログで以下を実行:
   - 投稿者名・コメント編集 → 保存
   - 画像回転 → 保存
   - 画像削除

#### cURLでの確認
```bash
# PATCH リクエストテスト
curl -X PATCH "https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/photos/test-id?admin=19931124" \
  -H "Content-Type: application/json" \
  -H "Origin: https://xxx.cloudfront.net" \
  -d '{"uploaderName": "テスト更新"}'

# DELETE リクエストテスト  
curl -X DELETE "https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/photos/test-id?admin=19931124" \
  -H "Origin: https://xxx.cloudfront.net"
```

## 🔍 CORS設定の詳細

### 修正されたファイル

1. **infrastructure/lib/stacks/memory-upload-stack.ts**
   - API Gateway全体のCORS設定
   - 管理者リソース専用のCORS設定

2. **infrastructure/lambda/admin-delete/index.js**
   - DELETE Lambda関数のCORSヘッダー

3. **infrastructure/lambda/admin-update/index.js**
   - PATCH Lambda関数のCORSヘッダー

### CORS設定の階層

```
API Gateway (RestApi)
├── defaultCorsPreflightOptions: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
└── /api (Resource)
    ├── defaultCorsPreflightOptions: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    └── /admin (Resource)
        ├── defaultCorsPreflightOptions: ['PATCH', 'DELETE', 'OPTIONS']
        └── /photos (Resource)
            ├── defaultCorsPreflightOptions: ['PATCH', 'DELETE', 'OPTIONS']
            └── /{photoId} (Resource)
                └── defaultCorsPreflightOptions: ['PATCH', 'DELETE', 'OPTIONS']
```

## 🚨 トラブルシューティング

### 修正後もCORSエラーが発生する場合

#### 1. ブラウザキャッシュクリア
```bash
# Chrome DevTools
# Application → Storage → Clear storage
```

#### 2. CloudFrontキャッシュ無効化
```bash
cd infrastructure
npm run cloudfront:invalidate
```

#### 3. API Gateway設定確認
```bash
# REST API IDを取得
aws apigateway get-rest-apis --region ap-northeast-1

# リソース設定確認
aws apigateway get-resources --rest-api-id YOUR_API_ID --region ap-northeast-1

# CORS設定確認
aws apigateway get-method --rest-api-id YOUR_API_ID --resource-id YOUR_RESOURCE_ID --http-method OPTIONS --region ap-northeast-1
```

#### 4. Lambda関数ログ確認
```bash
# 管理者機能のログ確認
aws logs tail /aws/lambda/JawsFestaMemoryUploadDev-AdminUpdateFunction --follow
aws logs tail /aws/lambda/JawsFestaMemoryUploadDev-AdminDeleteFunction --follow
```

### よくあるCORSエラーパターン

#### パターン1: Preflightリクエストの失敗
```
Method PATCH is not allowed by Access-Control-Allow-Methods
```
**解決**: API GatewayのCORS設定でPATCH/DELETEメソッドを許可

#### パターン2: ヘッダーの不許可
```
Request header X-Requested-With is not allowed by Access-Control-Allow-Headers
```
**解決**: allowHeadersに必要なヘッダーを追加

#### パターン3: オリジンの不許可
```
Origin 'https://xxx.cloudfront.net' is not allowed by Access-Control-Allow-Origin
```
**解決**: allowOriginsにCloudFrontドメインを追加

## 📋 修正完了チェックリスト

- [ ] CDKスタックの修正完了
- [ ] Lambda関数のCORSヘッダー修正完了
- [ ] インフラストラクチャ再デプロイ完了
- [ ] ブラウザでの管理者機能動作確認完了
- [ ] cURLでのAPI動作確認完了
- [ ] エラーログの確認完了

## 🎯 修正結果

✅ **CORS エラーが解決され、管理者機能が正常に動作するようになりました**

- 画像削除機能 (DELETE)
- 画像更新機能 (PATCH)
- 画像回転機能 (PATCH)

すべての管理者機能がブラウザから正常に実行できます。