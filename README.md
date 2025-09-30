# JAWS FESTA 2025 思い出アップロード

JAWS FESTA 2025 イベント参加者が撮影した画像を簡単に共有できるWebアプリケーションです。AWS CDKを使用したサーバーレス構成で、CDK初心者やTypeScript初心者でも理解しやすいシンプルな設計を採用しています。

## 🚀 機能

- 📱 **スマートフォン対応**: カメラ撮影・ファイル選択・ドラッグ&ドロップでの画像アップロード
- 🖼️ **画像一覧表示**: マソンリーレイアウト・カードグリッドレイアウトの切り替え可能
- ✅ **確認項目チェック**: 動的に設定可能な確認項目でのアップロード前チェック
- 🔄 **自動削除**: 30日後の自動削除機能（DynamoDB TTL）
- 📱 **レスポンシブデザイン**: モバイル・タブレット・PC対応
- 🎨 **ブランド化**: JAWS FESTA 2025公式ロゴ・金色テーマ・游明朝フォント
- ⚡ **高速デプロイ**: 最適化されたデプロイスクリプト（変更ファイルのみアップロード）

## 🎨 UI/UXデザイン

### ブランドアイデンティティ
- **メインカラー**: 金色（#FFD700系）
- **フォント**: 游明朝 (Yu Mincho) - 上品で読みやすい日本語フォント
- **ロゴ**: JAWS FESTA 2025 公式筆文字ロゴ
- **背景**: 金色グラデーションパターン

### レスポンシブデザイン
- **モバイルファースト**: スマートフォンでの操作を優先
- **タッチフレンドリー**: 大きなタップターゲット
- **アダプティブレイアウト**: デバイスサイズに応じた最適表示

### ユーザビリティ
- **シンプルなフロー**: 3ステップで画像アップロード完了
- **直感的なインターフェース**: アイコンとテキストで明確な指示
- **リアルタイムフィードバック**: アップロード進行状況を視覚化

### アクセシビリティ
- **キーボードナビゲーション**: Tabキーでの操作対応
- **スクリーンリーダー対応**: 適切なaria-labelとaltテキスト
- **コントラスト最適化**: WCAG 2.1 AAレベル準拠

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

## 🚀 デプロイ

デプロイ手順については、詳細なガイドを参照してください：

📖 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 完全なデプロイ手順とトラブルシューティング

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
│   │   │   ├── ImageUpload.tsx      # 画像アップロード
│   │   │   ├── ImageGallery.tsx     # 画像一覧表示
│   │   │   ├── MetadataForm.tsx     # メタデータ入力
│   │   │   └── ChecklistForm.tsx    # 確認項目チェック
│   │   ├── pages/          # ページコンポーネント
│   │   │   ├── HomePage.tsx         # メインページ
│   │   │   └── GalleryPage.tsx      # ギャラリーページ
│   │   ├── hooks/          # カスタムフック
│   │   │   ├── useImageUpload.ts    # 画像アップロード処理
│   │   │   └── useImageGallery.ts   # 画像一覧取得
│   │   ├── utils/          # ユーティリティ関数
│   │   │   ├── imageUtils.ts        # 画像処理
│   │   │   └── apiUtils.ts          # API通信
│   │   ├── api/            # API通信層
│   │   │   ├── photos.ts            # 画像API
│   │   │   ├── config.ts            # 設定API
│   │   │   └── admin.ts             # 管理者API
│   │   └── types/          # TypeScript 型定義
│   │       ├── Photo.ts             # 画像データ型
│   │       └── Config.ts            # 設定データ型
│   ├── public/
│   │   ├── assets/         # サイト画像（ロゴ・背景等）
│   │   │   ├── JAWSFESTA2025筆文字_1色_金.png
│   │   │   ├── background_gold_large.png
│   │   │   └── その他ブランド素材
│   │   └── favicon等       # ファビコン・アイコン
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
