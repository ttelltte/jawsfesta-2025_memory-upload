# JAWS FESTA 2025 思い出アップロード

JAWS FESTA 2025 イベント参加者が撮影した画像を簡単に共有できるWebアプリケーションです。AWS CDKを使用したサーバーレス構成で、CDK初心者やTypeScript初心者でも理解しやすいシンプルな設計を採用しています。

## 🚀 機能

- 📱 **スマートフォン対応**: カメラ撮影・ファイル選択・ドラッグ&ドロップでの画像アップロード
- 🖼️ **画像一覧表示**: マソンリーレイアウト・カードグリッドレイアウトの切り替え可能
- ✅ **確認項目チェック**: 動的に設定可能な確認項目でのアップロード前チェック
- 🔄 **自動削除**: 30日後の自動削除機能（DynamoDB TTL）
- 📱 **レスポンシブデザイン**: モバイル・タブレット・PC対応

## 🏗️ アーキテクチャ

```
[ユーザー] 
    ↓
[CloudFront + S3 静的サイト]
    ↓
[API Gateway]
    ↓
[Lambda Functions]
    ↓
[DynamoDB] + [S3 画像ストレージ]
```

### 技術スタック

- **Frontend**: React + Tailwind CSS + Vite
- **Backend**: AWS Lambda (Node.js 18.x)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **API**: Amazon API Gateway (REST API)
- **CDN**: Amazon CloudFront
- **Infrastructure**: AWS CDK (TypeScript)

## 📋 前提条件

- Node.js 18.x 以上
- npm 8.x 以上
- AWS CLI v2
- AWS CDK v2
- Git

## 🛠️ 環境設定

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/jaws-festa-memory-upload.git
cd jaws-festa-memory-upload
```

### 2. 依存関係のインストール

```bash
# ルートレベルの依存関係をインストール
npm install

# 各ワークスペースの依存関係をインストール
npm run install:all
```

### 3. AWS認証情報の設定

```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1
```

### 4. CDK Bootstrap（初回のみ）

```bash
cd infrastructure
npx cdk bootstrap
```

## 🚀 デプロイ手順

### 開発環境へのデプロイ

```bash
# 開発環境用の設定でデプロイ
npm run deploy:dev
```

### 本番環境へのデプロイ

```bash
# 本番環境用の設定でデプロイ
npm run deploy:prod
```

### 初期データの投入

デプロイ後、DynamoDB の Config テーブルに確認項目の初期データを投入する必要があります：

```bash
# 開発環境に初期データを投入
cd infrastructure
npm run setup-data:dev

# 本番環境に初期データを投入
npm run setup-data:prod

# 既存データを強制上書き
npm run setup-data:force

# 現在の設定を確認
npm run show-config
```

**PowerShell を使用する場合（Windows）:**

```powershell
# 開発環境に初期データを投入
cd infrastructure
.\scripts\setup-initial-data.ps1 dev

# 本番環境に初期データを投入
.\scripts\setup-initial-data.ps1 prod

# 既存データを強制上書き
.\scripts\setup-initial-data.ps1 dev -Force

# 現在の設定を確認
.\scripts\setup-initial-data.ps1 dev -Show
```

### 手動デプロイ

```bash
# インフラストラクチャのデプロイ
cd infrastructure
npm run build
npm run deploy

# フロントエンドのビルドとデプロイ
npm run deploy-frontend:build
```

### フロントエンドのみデプロイ

```bash
# 開発環境にフロントエンドをデプロイ
cd infrastructure
npm run deploy-frontend:dev

# 本番環境にフロントエンドをデプロイ
npm run deploy-frontend:prod

# 強制再ビルドしてデプロイ
npm run deploy-frontend:build
```

**PowerShell を使用する場合（Windows）:**

```powershell
# 開発環境にフロントエンドをデプロイ
cd infrastructure
.\scripts\deploy-frontend.ps1 dev

# 強制再ビルドしてデプロイ
.\scripts\deploy-frontend.ps1 dev -Build
```

## 🧪 開発・テスト

### ローカル開発

```bash
# フロントエンドの開発サーバー起動
npm run dev

# または
cd frontend
npm run dev
```

### テスト実行

```bash
# 全体のテスト実行
npm test

# フロントエンドのみ
npm run test:frontend

# バックエンドのみ
npm run test:backend
```

### ビルド

```bash
# 全体のビルド
npm run build

# フロントエンドのみ
npm run build:frontend

# バックエンドのみ
npm run build:backend
```

## 📁 プロジェクト構造

```
jaws-festa-memory-upload/
├── frontend/                 # React フロントエンド
│   ├── src/
│   │   ├── components/      # React コンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── utils/          # ユーティリティ関数
│   │   └── types/          # TypeScript 型定義
│   ├── public/             # 静的ファイル
│   └── package.json
├── backend/                  # Lambda 関数
│   ├── src/
│   │   ├── handlers/       # Lambda ハンドラー
│   │   ├── services/       # ビジネスロジック
│   │   ├── utils/          # ユーティリティ関数
│   │   └── types/          # TypeScript 型定義
│   └── package.json
├── infrastructure/           # AWS CDK
│   ├── lib/
│   │   ├── stacks/         # CDK スタック
│   │   ├── constructs/     # CDK コンストラクト
│   │   └── config/         # 環境設定
│   ├── bin/                # CDK アプリエントリーポイント
│   └── package.json
├── config/                   # 環境別設定ファイル
│   ├── dev.json
│   └── prod.json
└── package.json             # ルートパッケージ設定
```

## ⚙️ 環境設定ファイル

### config/dev.json
開発環境用の設定ファイル

```json
{
  "stackName": "JawsFestaMemoryUploadDev",
  "environment": "dev",
  "region": "ap-northeast-1",
  "domainName": "dev-memory.example.com"
}
```

### config/prod.json
本番環境用の設定ファイル

```json
{
  "stackName": "JawsFestaMemoryUploadProd", 
  "environment": "prod",
  "region": "ap-northeast-1",
  "domainName": "memory.example.com"
}
```

## 🌐 CloudFront キャッシュ管理

### キャッシュの無効化

```bash
# 全てのキャッシュを無効化
cd infrastructure
npm run cloudfront:invalidate

# 特定のパスのみ無効化
node scripts/cloudfront-cache-policy.js dev invalidate /index.html /assets/*

# 無効化のステータス確認
npm run cloudfront:status
```

### キャッシュ最適化のヒント

```bash
# キャッシュ最適化のベストプラクティスを表示
npm run cloudfront:tips
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. CDK Bootstrap エラー
```bash
# Bootstrap が必要な場合
npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

#### 2. 権限エラー
- AWS認証情報が正しく設定されているか確認
- IAMユーザーに必要な権限が付与されているか確認

#### 3. Node.js バージョンエラー
```bash
# Node.js バージョン確認
node --version

# 18.x 以上が必要です
```

#### 4. デプロイエラー
```bash
# CDK の差分確認
cd infrastructure
npx cdk diff

# 強制的な再デプロイ
npx cdk deploy --force
```

#### 5. フロントエンドデプロイエラー
```bash
# ビルドエラーの場合
cd frontend
npm ci
npm run build

# S3アップロードエラーの場合
cd infrastructure
npm run deploy-frontend:build

# CloudFrontキャッシュが古い場合
npm run cloudfront:invalidate
```

### ログの確認

```bash
# CloudWatch ログの確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/JawsFesta"

# 特定の Lambda 関数のログ
aws logs tail /aws/lambda/JawsFestaMemoryUpload-upload --follow
```

## 📝 設定のカスタマイズ

### 確認項目の変更

DynamoDB の Config テーブルで確認項目を動的に変更できます：

```json
{
  "PK": "CONFIG",
  "SK": "UPLOAD_CHECKLIST", 
  "items": [
    {
      "id": "event_participant",
      "text": "イベント参加者であることを確認しました",
      "required": true
    }
  ]
}
```

### 画像の自動削除期間変更

`infrastructure/lib/constructs/database.ts` で TTL 設定を変更：

```typescript
// 30日 → 60日に変更する場合
const ttlInSeconds = 60 * 24 * 60 * 60; // 60日
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙋‍♂️ サポート

質問や問題がある場合は、[Issues](https://github.com/your-username/jaws-festa-memory-upload/issues) で報告してください。

## 🎯 今後の拡張予定

- [ ] 認証機能の追加
- [ ] 画像の圧縮・リサイズ機能
- [ ] 管理者画面の追加
- [ ] WAF によるセキュリティ強化
- [ ] CloudTrail によるログ監査
- [ ] 多言語対応