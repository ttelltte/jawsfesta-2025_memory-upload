# トラブルシューティングガイド

このドキュメントでは、JAWS FESTA 2025 思い出アップロードプロジェクトでよく発生する問題と解決方法を説明します。

## 🚨 緊急時の対応

### サービス停止時の対応

1. **CloudWatch でエラーログを確認**
2. **Lambda 関数の実行状況を確認**
3. **DynamoDB と S3 の状態を確認**
4. **必要に応じてロールバック**

```bash
# 直前のデプロイをロールバック
cd infrastructure
npx cdk deploy --rollback
```

## 🔧 デプロイ関連の問題

### 1. CDK Bootstrap エラー

#### 症状
```
This stack uses assets, so the toolkit stack must be deployed to the environment
```

#### 原因
- CDK Bootstrap が実行されていない
- 異なるアカウント・リージョンでBootstrapが必要

#### 解決方法
```bash
# 現在のアカウント・リージョンを確認
aws sts get-caller-identity
aws configure get region

# Bootstrap を実行
npx cdk bootstrap aws://ACCOUNT_ID/REGION

# 例
npx cdk bootstrap aws://123456789012/ap-northeast-1
```

### 2. スタック名の重複エラー

#### 症状
```
Stack with id JawsFestaMemoryUploadDev already exists
```

#### 原因
- 同じスタック名が既に存在している
- 複数人が同じ設定でデプロイしている

#### 解決方法
```bash
# 設定ファイルでスタック名を変更
# config/dev.json
{
  "stackName": "YourName-MemoryUpload-Dev"
}
```

### 3. 権限エラー

#### 症状
```
User: arn:aws:iam::xxx:user/xxx is not authorized to perform: cloudformation:CreateStack
```

#### 原因
- IAMユーザーに必要な権限がない

#### 解決方法
```bash
# 管理者に以下の権限を付与してもらう
# - PowerUserAccess (推奨)
# - または個別に必要な権限を付与

# 現在の権限を確認
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

**必要な最小権限:**
- CloudFormation: 全権限
- S3: 全権限
- DynamoDB: 全権限
- Lambda: 全権限
- API Gateway: 全権限
- CloudFront: 全権限
- IAM: PassRole, CreateRole, AttachRolePolicy など

### 4. リソース制限エラー

#### 症状
```
LimitExceeded: Cannot exceed quota for PoliciesPerRole
```

#### 原因
- AWS アカウントのリソース制限に達している

#### 解決方法
```bash
# 不要なリソースを削除
aws cloudformation delete-stack --stack-name OLD_STACK_NAME

# AWS サポートに制限緩和を依頼
# または別のリージョンを使用
```

## 🌐 ネットワーク・API 関連の問題

### 1. CORS エラー

#### 症状
```
Access to fetch at 'https://api.example.com' from origin 'https://your-site.com' has been blocked by CORS policy
```

#### 原因
- API Gateway の CORS 設定が不正
- フロントエンドのドメインが許可されていない

#### 解決方法
```bash
# config/dev.json で CORS 設定を確認・修正
{
  "apiGateway": {
    "corsAllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173", 
      "https://your-actual-domain.com"  // ← 実際のドメインを追加
    ]
  }
}

# 再デプロイ
npm run deploy:dev
```

### 2. API Gateway タイムアウト

#### 症状
```
504 Gateway Timeout
```

#### 原因
- Lambda 関数の実行時間が長すぎる
- DynamoDB や S3 への接続が遅い

#### 解決方法
```bash
# Lambda のタイムアウト設定を確認・調整
# config/dev.json
{
  "lambda": {
    "timeout": 30,  // 秒単位で調整
    "memorySize": 512  // メモリも増やすと処理が速くなる場合がある
  }
}

# CloudWatch でLambda実行時間を確認
aws logs filter-log-events --log-group-name "/aws/lambda/FUNCTION_NAME" --filter-pattern "REPORT"
```

### 3. S3 アップロードエラー

#### 症状
```
SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided
```

#### 原因
- AWS認証情報が不正
- システム時刻がずれている

#### 解決方法
```bash
# システム時刻を確認・同期
# Windows
w32tm /resync

# Linux/Mac
sudo ntpdate -s time.nist.gov

# AWS認証情報を再設定
aws configure
```

## 💾 データベース関連の問題

### 1. DynamoDB 接続エラー

#### 症状
```
ResourceNotFoundException: Requested resource not found
```

#### 原因
- テーブルが作成されていない
- テーブル名が間違っている
- リージョンが間違っている

#### 解決方法
```bash
# テーブルの存在確認
aws dynamodb list-tables --region ap-northeast-1

# 特定のテーブルの詳細確認
aws dynamodb describe-table --table-name TABLE_NAME --region ap-northeast-1

# テーブルが存在しない場合は再デプロイ
cd infrastructure
npx cdk deploy
```

### 2. DynamoDB 書き込みエラー

#### 症状
```
ValidationException: One or more parameter values were invalid
```

#### 原因
- データ形式が不正
- 必須フィールドが不足
- データサイズが制限を超えている

#### 解決方法
```bash
# Lambda 関数のログを確認
aws logs tail /aws/lambda/FUNCTION_NAME --follow

# データ形式を確認・修正
# 例: TTL は数値型である必要がある
{
  "ttl": 1234567890,  // 文字列ではなく数値
  "uploadTime": "2025-03-22T10:00:00Z"  // ISO 8601 形式
}
```

### 3. 初期データ投入エラー

#### 症状
```
ConditionalCheckFailedException: The conditional request failed
```

#### 原因
- データが既に存在している
- 条件付き書き込みが失敗している

#### 解決方法
```bash
# 強制的に初期データを上書き
cd infrastructure
npm run setup-data:force

# または PowerShell
.\scripts\setup-initial-data.ps1 dev -Force

# 現在のデータを確認
npm run show-config
```

## 🖼️ フロントエンド関連の問題

### 1. ビルドエラー

#### 症状
```
Module not found: Error: Can't resolve './component'
```

#### 原因
- インポートパスが間違っている
- ファイルが存在しない
- 大文字小文字の違い

#### 解決方法
```bash
# 依存関係を再インストール
cd frontend
rm -rf node_modules package-lock.json
npm install

# TypeScript の型チェック
npm run type-check

# ビルドを実行
npm run build
```

### 2. 画像アップロードが失敗する

#### 症状
- アップロードボタンを押しても反応しない
- エラーメッセージが表示される

#### 原因
- API エンドポイントが間違っている
- ファイルサイズ制限を超えている
- ファイル形式が対応していない

#### 解決方法
```bash
# ブラウザの開発者ツールでネットワークタブを確認
# API エンドポイントの URL を確認

# フロントエンドの設定を確認
# frontend/src/api/upload.ts
const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com/prod';

# ファイルサイズ・形式制限を確認
# config/dev.json
{
  "upload": {
    "maxFileSize": "10485760",  // 10MB
    "allowedFileTypes": "image/*"
  }
}
```

### 3. 画像一覧が表示されない

#### 症状
- 「まだ画像がありません」と表示される
- 画像はアップロードされているはず

#### 原因
- API からデータが取得できていない
- S3 の Presigned URL が生成されていない

#### 解決方法
```bash
# API の動作確認
curl -X GET "https://your-api-gateway-url.amazonaws.com/prod/api/photos"

# DynamoDB のデータを直接確認
aws dynamodb scan --table-name YOUR_PHOTOS_TABLE --region ap-northeast-1

# Lambda 関数のログを確認
aws logs tail /aws/lambda/YOUR_LIST_FUNCTION --follow
```

## 🚀 パフォーマンス関連の問題

### 1. 画像読み込みが遅い

#### 症状
- 画像の表示に時間がかかる
- ページの読み込みが重い

#### 解決方法
```bash
# CloudFront のキャッシュ設定を確認
# config/dev.json
{
  "cloudfront": {
    "priceClass": "PriceClass_100",  // アジア太平洋のみ
    "cachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  }
}

# キャッシュを無効化
cd infrastructure
npm run cloudfront:invalidate

# 画像の最適化を検討
# - WebP 形式への変換
# - 画像サイズの制限
# - 遅延読み込みの実装
```

### 2. Lambda 関数が遅い

#### 症状
- API レスポンスに時間がかかる
- タイムアウトエラーが発生する

#### 解決方法
```bash
# Lambda のメモリサイズを増やす
# config/dev.json
{
  "lambda": {
    "memorySize": 512,  // 256 → 512 に増加
    "timeout": 30
  }
}

# CloudWatch でパフォーマンスメトリクスを確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME \
  --start-time 2025-03-22T00:00:00Z \
  --end-time 2025-03-22T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

## 🔍 ログとモニタリング

### CloudWatch ログの確認方法

```bash
# Lambda 関数のログ一覧
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/"

# 特定の関数のログをリアルタイム表示
aws logs tail /aws/lambda/JawsFestaMemoryUpload-upload --follow

# エラーログのみフィルタ
aws logs filter-log-events \
  --log-group-name "/aws/lambda/JawsFestaMemoryUpload-upload" \
  --filter-pattern "ERROR"

# 特定の時間範囲のログ
aws logs filter-log-events \
  --log-group-name "/aws/lambda/JawsFestaMemoryUpload-upload" \
  --start-time 1647072000000 \
  --end-time 1647075600000
```

### メトリクスの確認

```bash
# Lambda 関数の実行回数
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME \
  --start-time 2025-03-22T00:00:00Z \
  --end-time 2025-03-22T23:59:59Z \
  --period 3600 \
  --statistics Sum

# API Gateway のリクエスト数
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=YOUR_API_NAME \
  --start-time 2025-03-22T00:00:00Z \
  --end-time 2025-03-22T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 🛠️ 開発環境の問題

### 1. ローカル開発サーバーが起動しない

#### 症状
```
Error: Cannot find module 'vite'
```

#### 解決方法
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 2. Hot Reload が動作しない

#### 症状
- ファイルを変更してもブラウザが更新されない

#### 解決方法
```bash
# Vite の設定を確認
# frontend/vite.config.ts
export default defineConfig({
  server: {
    host: true,  // ネットワークからのアクセスを許可
    port: 5173
  }
});

# ファイアウォールの設定を確認
# ポート 5173 が開いているか確認
```

## 📞 サポートとヘルプ

### 問題が解決しない場合

1. **GitHub Issues で質問**
   - https://github.com/ttelltte/jawsfesta-2025_memory-upload/issues
   - 問題の詳細、エラーメッセージ、実行環境を記載

2. **AWS サポート**
   - AWS の技術的な問題については AWS サポートに問い合わせ

3. **コミュニティ**
   - JAWS-UG コミュニティで質問
   - Stack Overflow で検索・質問

### 問題報告時に含める情報

- **環境情報**
  - OS (Windows/Mac/Linux)
  - Node.js バージョン
  - AWS CLI バージョン
  - ブラウザ（フロントエンドの問題の場合）

- **エラー情報**
  - 完全なエラーメッセージ
  - スタックトレース
  - 実行したコマンド

- **設定情報**
  - 設定ファイルの内容（機密情報は除く）
  - AWS リージョン
  - 使用している AWS プロファイル

### 緊急時の連絡先

本番環境で重大な問題が発生した場合：

1. **即座にサービスを停止**
2. **問題の影響範囲を特定**
3. **ログを保存**
4. **管理者に連絡**

## 📚 参考資料

- [AWS CDK Troubleshooting](https://docs.aws.amazon.com/cdk/v2/guide/troubleshooting.html)
- [AWS Lambda Troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting.html)
- [API Gateway Troubleshooting](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-troubleshooting.html)
- [DynamoDB Troubleshooting](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Troubleshooting.html)
- [CloudFront Troubleshooting](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/troubleshooting.html)