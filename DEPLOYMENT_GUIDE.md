# 🚀 JAWS FESTA 2025 思い出アップロード - シンプルデプロイガイド

## 📋 概要

このドキュメントは、JAWS FESTA 2025 思い出アップロードプロジェクトの**シンプルなデプロイ手順**を説明します。

## 🎯 前提条件

### 必要なソフトウェア

- **Node.js**: 18.x 以上
- **npm**: 8.x 以上  
- **AWS CLI**: v2
- **PowerShell**: Windows環境

### AWS設定

```bash
# AWS認証情報の確認
aws sts get-caller-identity

# 正しいプロファイルに切り替え（必要に応じて）
$env:AWS_PROFILE = "your-profile-name"
```

## 🚀 デプロイ手順

### ⚡ 最適化デプロイ（推奨）

```bash
# フロントエンドのみ更新（高速）
cd infrastructure
node scripts/deploy-frontend.js dev

# ビルド付きデプロイ
node scripts/deploy-frontend.js dev --build

# 本番環境へのデプロイ
node scripts/deploy-frontend.js prod
```

**最適化の特徴:**
- ✅ サイト画像スキップ（初回のみアップロード）
- ✅ JS/CSS/HTMLのみ毎回更新
- ✅ ユーザー投稿画像保護
- ✅ CloudFrontキャッシュ自動無効化
- ✅ デプロイ時間短縮（5ファイルのみ）

### 📁 ファイル構成の理解

**S3バケット内のフォルダ構成:**
```
s3://bucket-name/
├── assets/           # サイト用画像（初回のみアップロード）
│   ├── css/          # CSSファイル（毎回更新）
│   ├── js/           # JavaScriptファイル（毎回更新）
│   └── *.png         # ロゴ・背景等（保持）
├── images/           # ユーザー投稿画像（保護）
└── index.html        # メインHTML（毎回更新）
```

### 🔐 管理者機能

**アクセス方法:**
```
https://your-domain.com?admin=<ADMIN_PASSWORD>
```

**機能:**
- 画像削除（DELETE /api/admin/photos/{id}）
- 画像情報編集（PATCH /api/admin/photos/{id}）
- 画像回転（90度単位）

**Lambda関数:**
- AdminDeleteFunction: 画像削除処理
- AdminUpdateFunction: 画像更新・回転処理

**デプロイ対象ファイル:**
- ✅ **毎回アップロード**: index.html, assets/css/*, assets/js/*, favicon等
- ⛔ **スキップ**: assets/内の画像ファイル
- 🔒 **保護**: images/内のユーザー投稿画像

### ステップ1: 初回セットアップ（初回のみ）

```bash
# 1. 依存関係インストール
cd infrastructure
npm install

cd ../frontend  
npm install

cd ../backend
npm install

# 2. CDK Bootstrap（初回のみ）
cd ../infrastructure
npx cdk bootstrap

# 3. インフラ＋バックエンドデプロイ
npm run deploy:dev
```

### ステップ2: 完全自動デプロイ

```bash
# 初回デプロイ（インフラ + フロントエンド）
powershell -ExecutionPolicy Bypass -File deploy-complete.ps1

# フロントエンドのみ更新
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

**これだけです！** 🎉

### 🔧 自動化の仕組み

- **環境変数自動更新**: AWS CloudFormationから最新のURLを取得
- **設定ファイル自動更新**: CloudFront Distribution IDを自動設定
- **ハードコーディング撲滅**: 手動でURLを設定する必要なし

## 📁 作成されたファイル

- `deploy.ps1` - シンプルなフロントエンドデプロイスクリプト

## 🔄 日常的な更新

### フロントエンドのみ更新する場合

```bash
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

### バックエンド（Lambda関数）も更新する場合

```bash
# 1. インフラ＋バックエンド更新
cd infrastructure
npm run deploy:dev

# 2. フロントエンド更新  
cd ..
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

### 📝 重要な注意点

- **バックエンド（Lambda関数）**: CDKデプロイ（`npm run deploy:dev`）に含まれます
- **フロントエンド（React）**: 別途S3にデプロイが必要です（`deploy.ps1`）
- **インフラ（AWS リソース）**: CDKデプロイで作成・更新されます

## 🛠️ deploy.ps1 の内容

```powershell
# JAWS FESTA Memory Upload - Simple Deploy
Write-Host "Starting deployment..." -ForegroundColor Green

# Get S3 bucket name
Write-Host "Getting S3 bucket name..." -ForegroundColor Yellow
$bucketName = aws cloudformation describe-stacks --stack-name JawsFestaMemoryUploadDev --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text

if ([string]::IsNullOrEmpty($bucketName)) {
    Write-Host "Failed to get S3 bucket name" -ForegroundColor Red
    exit 1
}

Write-Host "S3 Bucket: $bucketName" -ForegroundColor Green

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build

# Upload to S3
Write-Host "Uploading to S3..." -ForegroundColor Yellow
aws s3 sync dist/ s3://$bucketName --delete --exclude "images/*"

Set-Location ..
Write-Host "Deploy completed!" -ForegroundColor Green
```

## 🚨 トラブルシューティング

### よくあるエラーと解決方法

#### 1. S3バケット名が取得できない

```bash
# 原因: CDKデプロイが完了していない
# 解決: インフラを先にデプロイ
cd infrastructure
npm run deploy:dev
```

#### 2. フロントエンドビルドエラー

```bash
# 原因: 依存関係の問題
# 解決: 依存関係を再インストール
cd frontend
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

#### 3. AWS認証エラー

```bash
# 原因: 認証情報が設定されていない
# 解決: プロファイルを設定
$env:AWS_PROFILE = "your-profile-name"
aws sts get-caller-identity
```

#### 4. PowerShell実行ポリシーエラー

```bash
# 原因: PowerShellの実行ポリシー
# 解決: 実行ポリシーを一時的に変更
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

#### 5. バックエンドAPI エラー

```bash
# 原因: Lambda関数のデプロイが失敗
# 解決: バックエンドの依存関係を確認してCDK再デプロイ
cd backend
npm install
cd ../infrastructure
npm run deploy:dev
```

#### 6. rollupエラー

```bash
# 原因: rollupパッケージが不足
# 解決: rollupをインストール
cd frontend
npm install rollup
npm run build
```

#### 7. MIME typeエラー

```bash
# 原因: JSファイルがアップロードされていない
# 解決: 最適化デプロイスクリプト使用
cd infrastructure
node scripts/deploy-frontend.js dev --build
```

## 🔧 詳細トラブルシューティング

### 🚑 緊急時の対応

```bash
# サービス停止時の対応
# 1. CloudWatch でエラーログを確認
# 2. Lambda 関数の実行状況を確認
# 3. DynamoDB と S3 の状態を確認
# 4. 必要に応じてロールバック

cd infrastructure
npx cdk deploy --rollback
```

### 🌐 CORSエラー

```bash
# config/dev.json で CORS 設定を確認・修正
{
  "apiGateway": {
    "corsAllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173", 
      "https://your-actual-domain.com"
    ]
  }
}

# 再デプロイ
npm run deploy:dev
```

### 📊 パフォーマンス問題

```bash
# Lambda のメモリサイズを増やす
# config/dev.json
{
  "lambda": {
    "memorySize": 512,  # 256 → 512 に増加
    "timeout": 30
  }
}

# CloudWatch でパフォーマンスメトリクスを確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=YOUR_FUNCTION_NAME
```

### 📁 ログの確認

```bash
# Lambda 関数のログをリアルタイム表示
aws logs tail /aws/lambda/JawsFestaMemoryUpload-upload --follow

# 管理者機能のログ確認
aws logs tail /aws/lambda/JawsFestaMemoryUploadDev-AdminUpdateFunction --follow
aws logs tail /aws/lambda/JawsFestaMemoryUploadDev-AdminDeleteFunction --follow

# エラーログのみフィルタ
aws logs filter-log-events \
  --log-group-name "/aws/lambda/JawsFestaMemoryUpload-upload" \
  --filter-pattern "ERROR"
```

## ⚙️ 環境変数詳細設定

### 必須環境変数

| 項目 | 説明 | 例 |
|------|------|-----|
| `stackName` | CloudFormation スタック名 | `JawsFestaMemoryUploadDev` |
| `account` | AWS アカウント ID | `123456789012` |
| `region` | AWS リージョン | `ap-northeast-1` |
| `domainName` | カスタムドメイン名 | `your-domain.example.com` |
| `certificateArn` | SSL証明書のARN | `arn:aws:acm:us-east-1:...` |

### AWS認証情報の設定

```bash
# AWS CLIで設定
aws configure

# 環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1

# プロファイルで設定
export AWS_PROFILE=your-profile-name
```

## 📊 デプロイ結果の確認

### 作成されるAWSリソース

| リソース             | 用途                             | デプロイ方法   | 例                                                          |
| -------------------- | -------------------------------- | -------------- | ----------------------------------------------------------- |
| S3 Bucket            | 画像保存・静的サイトホスティング | CDK            | `jawsfestamemoryuploaddev-photosbucket2ac9d1f0-xxx`         |
| DynamoDB Tables      | データ保存                       | CDK            | Photos, Config                                              |
| **Lambda Functions** | **バックエンドAPI処理**          | **CDK**        | **Upload, List, Config, AdminUpdate, AdminDelete**          |
| API Gateway          | REST API                         | CDK            | `https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/` |
| CloudFront           | CDN                              | CDK            | `https://xxx.cloudfront.net`                                |
| **React App**        | **フロントエンド**               | **deploy.ps1** | **S3にデプロイされる静的ファイル**                          |

### アクセスURL確認

```bash
# CDKデプロイ後に表示されるURL
# WebsiteUrl: https://xxx.cloudfront.net
# ApiGatewayUrl: https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/
```

## 🎯 なぜシンプルにしたのか

従来のデプロイプロセスは複雑すぎました：

- ❌ 複数のnpmスクリプト
- ❌ 複雑な設定ファイル管理
- ❌ CDK出力ファイルの依存関係
- ❌ 多段階のコマンド実行

新しいプロセスは：

- ✅ 1つのPowerShellスクリプト
- ✅ AWS CLIから直接情報取得
- ✅ シンプルな手順
- ✅ エラーハンドリング

## 📞 サポート

問題が発生した場合：

1. エラーメッセージを確認
2. トラブルシューティングセクションを参照
3. それでも解決しない場合は、エラーメッセージと実行環境を記録して報告

---

**最終更新**: 2025年9月24日  
**バージョン**: 2.0.0 (シンプル版)