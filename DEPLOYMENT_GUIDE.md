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