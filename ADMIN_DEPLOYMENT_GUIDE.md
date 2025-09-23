# 🚀 管理者機能を含むデプロイガイド

## 📋 概要

管理者機能（画像削除・編集・回転）を含むJAWS FESTA 2025 思い出アップロードプロジェクトの完全デプロイガイドです。

## 🎯 デプロイの流れ

### 1️⃣ 事前準備

#### 必要な環境
```bash
# Node.js バージョン確認
node --version  # 18.x 以上

# AWS認証確認
aws sts get-caller-identity

# リージョン確認
aws configure get region  # ap-northeast-1
```

#### 依存関係インストール
```bash
# 全プロジェクトの依存関係を一括インストール
npm run install:all

# または個別にインストール
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd infrastructure && npm install && cd ..
```

### 2️⃣ ローカル開発環境での動作確認

#### バックエンドサーバー起動
```bash
cd backend
npm run dev
```

#### 管理者API動作確認
```bash
# 管理者APIテスト実行
npm run test:admin

# または手動テスト
curl "http://localhost:3001/api/photos"
curl "http://localhost:3001/api/config"
```

#### フロントエンド開発サーバー起動
```bash
cd frontend
npm run dev
```

### 3️⃣ AWS環境へのデプロイ

#### Step 1: CDK Bootstrap（初回のみ）
```bash
cd infrastructure
npx cdk bootstrap
```

#### Step 2: インフラストラクチャデプロイ
```bash
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

**デプロイ完了時の出力例:**
```
✅  JawsFestaMemoryUploadDev

Outputs:
JawsFestaMemoryUploadDev.ApiGatewayUrl = https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/
JawsFestaMemoryUploadDev.CloudFrontDistributionId = E2B3V7FM1IT2W2
JawsFestaMemoryUploadDev.WebsiteUrl = https://xxx.cloudfront.net
JawsFestaMemoryUploadDev.AdminDeleteFunctionName = JawsFestaMemoryUploadDev-AdminDeleteFunction
JawsFestaMemoryUploadDev.AdminUpdateFunctionName = JawsFestaMemoryUploadDev-AdminUpdateFunction
```

#### Step 3: 初期データ投入
```bash
cd infrastructure
npm run setup-data:dev
```

#### Step 4: フロントエンドビルド・デプロイ
```bash
# フロントエンドビルド
cd frontend
npm run build

# S3にデプロイ
cd ../infrastructure
npm run deploy-frontend:dev
```

#### Step 5: CloudFrontキャッシュ無効化
```bash
cd infrastructure
npm run cloudfront:invalidate
```

### 4️⃣ 動作確認

#### API動作確認
```bash
# 基本API確認
curl https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/config
curl https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/photos

# 管理者API確認（認証エラーテスト）
curl -X DELETE "https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/api/admin/photos/test?admin=wrongpassword"
# → 401 Unauthorized が返ることを確認
```

#### ウェブサイト動作確認
1. **一般ユーザー機能**
   - https://xxx.cloudfront.net にアクセス
   - 画像アップロード機能の確認
   - 画像一覧表示の確認

2. **管理者機能**
   - https://xxx.cloudfront.net?admin=19931124 にアクセス
   - 画像の歯車ボタンが表示されることを確認
   - 管理者編集ダイアログの動作確認
   - 画像削除・編集・回転機能の確認

## 🔄 継続デプロイ（更新時）

### 管理者機能のみ更新
```bash
# Lambda関数のみ再デプロイ
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

### フロントエンドのみ更新
```bash
cd infrastructure
npm run deploy-frontend:build
npm run cloudfront:invalidate
```

### 全体更新
```bash
cd infrastructure
npm run deploy:dev
npm run deploy-frontend:build
npm run cloudfront:invalidate
```

## 🏗️ 作成されるAWSリソース

### 管理者機能関連の新規リソース

| リソース | 用途 | 設定 |
|---------|------|------|
| AdminDeleteFunction | 画像削除API | タイムアウト: 30秒, メモリ: 256MB |
| AdminUpdateFunction | 画像更新・回転API | タイムアウト: 60秒, メモリ: 1024MB |
| API Gateway エンドポイント | 管理者API | DELETE/PATCH /api/admin/photos/{id} |

### 既存リソース
| リソース | 用途 | 例 |
|---------|------|-----|
| S3 Bucket | 画像保存・静的サイト | jawsfestamemoryuploaddev-photosbucket-xxx |
| DynamoDB Tables | データ保存 | Photos, Config |
| Lambda Functions | 基本API | Upload, List, Config |
| CloudFront | CDN | https://xxx.cloudfront.net |

## 🔒 セキュリティ設定

### 管理者認証
- **認証方式**: URLパラメータ `?admin=19931124`
- **環境変数**: `ADMIN_PASSWORD=19931124`
- **権限**: 画像削除・更新のみ

### IAM権限
```json
{
  "AdminDeleteFunction": [
    "s3:DeleteObject",
    "dynamodb:GetItem",
    "dynamodb:DeleteItem"
  ],
  "AdminUpdateFunction": [
    "s3:GetObject",
    "s3:PutObject", 
    "dynamodb:GetItem",
    "dynamodb:UpdateItem"
  ]
}
```

## 🧪 テスト方法

### 1. ローカル環境テスト
```bash
cd backend
npm run test:admin
```

### 2. AWS環境テスト
```bash
# 環境変数設定
export API_URL="https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev"

# テスト実行
cd backend
npm run test:admin
```

### 3. 手動テスト手順
1. 画像をアップロード
2. 管理者モードでアクセス (`?admin=19931124`)
3. 歯車ボタンから編集ダイアログを開く
4. 各機能をテスト:
   - 投稿者名編集
   - コメント編集
   - 画像回転（90度）
   - 画像削除

## 🚨 トラブルシューティング

### よくある問題

#### 1. Sharp ライブラリエラー
```bash
# Lambda環境用にSharpを再インストール
cd infrastructure/lambda/admin-update
npm install sharp --platform=linux --arch=x64
```

#### 2. 管理者認証エラー
```bash
# 環境変数確認
aws lambda get-function-configuration --function-name AdminDeleteFunction --query 'Environment.Variables.ADMIN_PASSWORD'
```

#### 3. Lambda タイムアウト
- 大きな画像の回転処理でタイムアウトが発生する場合
- CDKスタックでタイムアウト時間を延長（現在60秒）

#### 4. 権限エラー
```bash
# Lambda関数の権限確認
aws iam list-attached-role-policies --role-name JawsFestaMemoryUploadDev-AdminUpdateFunctionServiceRole
```

## 📊 監視・ログ

### CloudWatch Logs
```bash
# 管理者機能のログ確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/JawsFestaMemoryUploadDev-Admin"

# リアルタイムログ監視
aws logs tail /aws/lambda/JawsFestaMemoryUploadDev-AdminUpdateFunction --follow
```

### メトリクス監視
- Lambda関数の実行時間
- エラー率
- 同時実行数
- S3操作の成功率

## 🔧 設定カスタマイズ

### 管理者パスワード変更
```bash
# config/dev.json に追加
{
  "admin": {
    "password": "your-secure-password"
  }
}

# 再デプロイ
cd infrastructure
npx cdk deploy
```

### 画像処理設定
```javascript
// Lambda関数内で調整可能
const rotatedBuffer = await sharp(imageBuffer)
  .rotate(rotation)
  .jpeg({ quality: 90 }) // 品質調整
  .toBuffer();
```

## 📈 パフォーマンス最適化

### Lambda関数最適化
- **AdminUpdateFunction**: メモリ1024MB（画像処理用）
- **AdminDeleteFunction**: メモリ256MB（軽量処理用）
- 適切なタイムアウト設定

### S3最適化
- 画像回転時の一時的な重複を避ける
- 適切なContent-Type設定
- キャッシュ制御ヘッダー

## 🎯 デプロイチェックリスト

### 事前確認
- [ ] AWS認証情報設定済み
- [ ] Node.js 18.x以上インストール済み
- [ ] 依存関係インストール完了

### デプロイ実行
- [ ] CDK Bootstrap実行（初回のみ）
- [ ] インフラストラクチャデプロイ完了
- [ ] 初期データ投入完了
- [ ] フロントエンドデプロイ完了
- [ ] CloudFrontキャッシュ無効化完了

### 動作確認
- [ ] 基本API動作確認
- [ ] 管理者API動作確認
- [ ] ウェブサイト表示確認
- [ ] 管理者機能動作確認
- [ ] エラーハンドリング確認

### 運用準備
- [ ] CloudWatchログ設定確認
- [ ] 監視アラート設定
- [ ] バックアップ設定確認
- [ ] セキュリティ設定確認

---

**管理者機能を含む完全なデプロイが完了しました！**

このガイドに従って、安全で確実なデプロイを実行してください。