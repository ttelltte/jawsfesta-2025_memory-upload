# 🚀 JAWS FESTA 2025 思い出アップロード - シンプルデプロイガイド

## 📋 概要

このドキュメントは、JAWS FESTA 2025 思い出アップロードプロジェクトの**シンプルなデプロイ手順**を説明します。

## 🚀 クイックスタート（経験者向け）

```bash
# 1. 依存関係のインストール（初回のみ）
cd frontend && npm install
cd ../infrastructure && npm install
cd ../backend && npm install

# 2. フロントエンドのビルドとデプロイ
cd ../infrastructure
node scripts/deploy-frontend.js dev --build

# 完了！
```

**初めての方は、以下の詳細な手順を参照してください。**

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

$env:AWS_PROFILE = "terai-private-env@375057248858"
```

## 🚀 デプロイ手順

### ✅ デプロイ前チェックリスト

デプロイを実行する前に、以下を確認してください：

```bash
# 1. AWS認証情報の確認
aws sts get-caller-identity

# 2. frontendの依存関係を確認
cd frontend
dir node_modules\.bin\vite*
# vite.cmd が存在しない場合は npm install を実行

# 3. ビルドが成功するか確認
npm run build
# ✓ built in X.XXs と表示されればOK

# 4. infrastructureの依存関係を確認
cd ../infrastructure
npm list aws-cdk-lib
# aws-cdk-lib が表示されればOK
```

**チェックリストが全て通れば、デプロイ準備完了です！**

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

### ⚠️ 重要: 依存関係のインストール

**デプロイ前に必ず各ディレクトリで依存関係をインストールしてください。**

```bash
# フロントエンド（最重要！）
cd frontend
npm install

# インフラストラクチャ
cd ../infrastructure
npm install

# バックエンド
cd ../backend
npm install
```

**なぜこれが重要なのか？**

- `frontend/node_modules`に`vite`がインストールされていないと、ビルドが失敗します
- デプロイスクリプトは`npm run build`を実行しますが、`vite`コマンドが見つからないとエラーになります
- 各ディレクトリには独立した`package.json`があり、それぞれで`npm install`が必要です

**よくある間違い:**
```bash
# ❌ 間違い: ルートディレクトリでnpm install
cd jawsfesta-2025_memory-upload
npm install  # これは何もインストールしません

# ✅ 正しい: 各ディレクトリで個別にnpm install
cd frontend
npm install  # frontendの依存関係をインストール
```

**トラブルシューティング:**

もし`vite`コマンドが見つからないエラーが出た場合：

```bash
# 1. frontendディレクトリに移動
cd frontend

# 2. node_modulesを削除して再インストール
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install

# 3. viteがインストールされたか確認
dir node_modules\.bin\vite*

# 4. ビルドをテスト
npm run build
```

### ステップ1: 初回セットアップ（初回のみ）

```bash
# 1. 依存関係インストール（上記の「重要: 依存関係のインストール」を参照）
cd frontend
npm install

cd ../infrastructure
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

#### 2. フロントエンドビルドエラー（'vite' は認識されていません）

**エラーメッセージ:**
```
'vite' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
```

**原因:**
- `frontend/node_modules`に`vite`がインストールされていない
- 間違ったディレクトリで`npm install`を実行した
- `node_modules`が削除されたか、不完全なインストール

**解決方法:**
```bash
# 1. frontendディレクトリに移動
cd frontend

# 2. 依存関係を再インストール
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install

# 3. viteがインストールされたか確認
dir node_modules\.bin\vite*
# vite.cmd, vite.ps1 が表示されればOK

# 4. ビルドをテスト
npm run build
```

**予防策:**
- デプロイ前に必ず`frontend`ディレクトリで`npm install`を実行
- `node_modules`を削除した場合は、必ず再インストール
- 各ディレクトリ（frontend, infrastructure, backend）で個別に`npm install`が必要

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

| 項目             | 説明                      | 例                          |
| ---------------- | ------------------------- | --------------------------- |
| `stackName`      | CloudFormation スタック名 | `JawsFestaMemoryUploadDev`  |
| `account`        | AWS アカウント ID         | `123456789012`              |
| `region`         | AWS リージョン            | `ap-northeast-1`            |
| `domainName`     | カスタムドメイン名        | `your-domain.example.com`   |
| `certificateArn` | SSL証明書のARN            | `arn:aws:acm:us-east-1:...` |

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

## � 環ポ境診断コマンド

問題が発生した場合、以下のコマンドで環境を診断できます：

```bash
# 診断スクリプトを実行
powershell -ExecutionPolicy Bypass -Command "
Write-Host '=== 環境診断 ===' -ForegroundColor Cyan

# Node.js バージョン
Write-Host 'Node.js:' -NoNewline
node --version

# npm バージョン
Write-Host 'npm:' -NoNewline
npm --version

# AWS CLI バージョン
Write-Host 'AWS CLI:' -NoNewline
aws --version

# AWS 認証情報
Write-Host 'AWS Account:' -NoNewline
aws sts get-caller-identity --query Account --output text

# frontend の依存関係
Write-Host 'Frontend vite:' -NoNewline
if (Test-Path 'frontend/node_modules/.bin/vite.cmd') {
    Write-Host ' インストール済み' -ForegroundColor Green
} else {
    Write-Host ' 未インストール' -ForegroundColor Red
}

# infrastructure の依存関係
Write-Host 'Infrastructure CDK:' -NoNewline
if (Test-Path 'infrastructure/node_modules/aws-cdk-lib') {
    Write-Host ' インストール済み' -ForegroundColor Green
} else {
    Write-Host ' 未インストール' -ForegroundColor Red
}

Write-Host '=== 診断完了 ===' -ForegroundColor Cyan
"
```

## 📞 サポート

問題が発生した場合：

1. **環境診断コマンドを実行**して現在の状態を確認
2. **エラーメッセージを確認**
3. **トラブルシューティングセクションを参照**
4. **よくある質問（FAQ）を確認**
5. それでも解決しない場合は、エラーメッセージと実行環境を記録して報告

## ❓ よくある質問（FAQ）

### Q1: 以前はビルドが成功していたのに、突然失敗するようになった

**A:** `frontend/node_modules`が削除されたか、不完全な状態になっている可能性があります。

```bash
cd frontend
npm install
npm run build
```

### Q2: どのディレクトリでnpm installを実行すればいいの？

**A:** プロジェクトには3つの独立したNode.jsプロジェクトがあります：

```bash
# 1. フロントエンド（React + Vite）
cd frontend
npm install

# 2. インフラストラクチャ（AWS CDK）
cd infrastructure
npm install

# 3. バックエンド（Lambda関数）
cd backend
npm install
```

**ルートディレクトリで`npm install`を実行しても何もインストールされません。**

### Q3: デプロイスクリプトが「viteが見つからない」と言われる

**A:** `frontend`ディレクトリで`npm install`を実行していないか、インストールが不完全です。

```bash
cd frontend
npm install
# 276パッケージがインストールされることを確認
```

### Q4: node_modulesを削除してしまった

**A:** 各ディレクトリで再度`npm install`を実行してください。

```bash
cd frontend
npm install

cd ../infrastructure
npm install

cd ../backend
npm install
```

### Q5: デプロイ前に毎回npm installが必要？

**A:** いいえ、依存関係が変更されていない限り不要です。ただし：

- 初回セットアップ時は必須
- `node_modules`を削除した場合は必須
- `package.json`が更新された場合は必須
- エラーが出た場合は再インストールを試す

---

**最終更新**: 2025年10月9日  
**バージョン**: 2.1.0 (依存関係管理の改善版)