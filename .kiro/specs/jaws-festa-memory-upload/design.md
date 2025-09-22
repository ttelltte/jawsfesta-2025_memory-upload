# Design Document

## Overview

JAWS FESTA 2025 思い出アップロードは、AWS CDKを使用したサーバーレス構成のWebアプリケーションです。CDK初心者にも理解しやすいシンプルな設計で、静的サイトホスティング + API Gateway + Lambda + DynamoDB + S3の構成を採用します。フロントエンドはReact + Tailwind CSSで実装し、モダンで汎用的な技術スタックを使用します。

## Architecture

### システム構成図

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

- **Frontend**: React + Tailwind CSS
- **Backend**: AWS Lambda (Node.js 18.x)
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **API**: Amazon API Gateway (REST API)
- **CDN**: Amazon CloudFront
- **Infrastructure**: AWS CDK (TypeScript)
- **Build Tool**: Vite (React開発環境)

### CDK Stack構成

単一のStackで全リソースを管理し、初心者にも理解しやすい構成とします：

```typescript
// MemoryUploadStack
├── S3 Bucket (静的サイト + 画像保存)
├── CloudFront Distribution
├── DynamoDB Table
├── Lambda Functions
├── API Gateway
└── IAM Roles & Policies
```

## Components and Interfaces

### 1. Frontend Components

#### 1.1 Upload Component
- **画像アップロード機能**
  - ファイル選択ボタン
  - ドラッグ&ドロップエリア
  - カメラ撮影ボタン（モバイル対応）
  - 画像プレビュー表示
- **メタデータ入力**
  - 名前入力フィールド（任意）
  - コメント入力フィールド（任意）
- **確認項目チェック**
  - 動的に生成されるチェックボックス一覧
  - 全項目チェック必須のバリデーション
- **注意事項表示**
  - 「写真はパブリックに公開されます」
  - 「JAWS-UG行動規範に沿った内容ではないと判断した場合、その場で削除・注意をします」
  - 「30日後に自動的に削除されます」

#### 1.2 Gallery Component
- **画像一覧表示**
  - マソンリーレイアウト（デフォルト）
  - カードグリッドレイアウト
  - 表示切り替えボタン
- **レスポンシブデザイン（Tailwind CSS）**
  - モバイル：1列表示
  - タブレット：2-3列表示
  - PC：4-6列表示

#### 1.3 共通コンポーネント
- **Navigation**: React Routerでのページ間移動
- **Loading**: アップロード中の進捗表示
- **Error Handling**: エラーメッセージ表示
- **Layout**: 共通レイアウトコンポーネント

### 2. Backend Components

#### 2.1 Lambda Functions

**Upload Function** (`upload.js`)
- **役割**: 画像アップロード処理
- **処理フロー**:
  1. 確認項目設定の取得
  2. リクエストバリデーション
  3. S3への画像アップロード
  4. DynamoDBへのメタデータ保存
  5. レスポンス返却

**List Function** (`list.js`)
- **役割**: 画像一覧取得
- **処理フロー**:
  1. DynamoDBから画像メタデータ取得
  2. 新着順でソート
  3. S3 Presigned URLの生成
  4. レスポンス返却

**Config Function** (`config.js`)
- **役割**: 確認項目設定の取得
- **処理フロー**:
  1. DynamoDBから確認項目設定を取得
  2. JSON形式でレスポンス返却

#### 2.2 API Endpoints

```
GET  /api/photos     - 画像一覧取得
POST /api/upload     - 画像アップロード
GET  /api/config     - 確認項目設定取得
```

## Data Models

### 1. DynamoDB Tables

#### 1.1 Photos Table
```javascript
{
  PK: "PHOTO#<uuid>",                    // Partition Key
  SK: "METADATA",                        // Sort Key
  id: "<uuid>",                          // 画像ID
  s3Key: "images/山田太郎_20250322_143025_abc123.jpg", // S3オブジェクトキー（投稿者名_日時_ランダム文字）
  uploaderName: "山田太郎",               // アップロード者名（匿名の場合は"Anonymous"）
  comment: "楽しかった！",                // コメント（任意）
  uploadTime: "2025-03-22T14:30:25+09:00", // アップロード時刻（ISO 8601 JST）
  uploadTimeUnix: 1647072000000,         // Unix timestamp（ソート用）
  ttl: 1647658800000                     // TTL（30日後の自動削除用）
}
```

#### 1.2 Config Table
```javascript
{
  PK: "CONFIG",                 // Partition Key
  SK: "UPLOAD_CHECKLIST",       // Sort Key
  items: [                      // 確認項目配列
    {
      id: "event_participant",
      text: "イベント参加者であることを確認しました",
      required: true
    },
    {
      id: "appropriate_content",
      text: "JAWS-UG行動規範に沿った内容であることを確認しました", 
      required: true
    },
    {
      id: "public_sharing",
      text: "写真がパブリックに公開されることを理解しました",
      required: true
    },
    {
      id: "auto_deletion",
      text: "30日後に自動的に削除されることを理解しました",
      required: true
    }
  ],
  updatedAt: 1647072000000     // 最終更新時刻
}
```

### 2. S3 Object Structure

```
memory-upload-bucket/
├── static/                   # React ビルド済みファイル
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
└── images/                   # アップロード画像
    ├── 山田太郎_20250322_143025_abc123.jpg
    ├── Anonymous_20250322_144512_def456.png
    └── 佐藤花子_20250322_145030_ghi789.webp
```

## Error Handling

### 1. Frontend Error Handling

#### 1.1 ファイルバリデーション
- **ファイルサイズ**: 10MB上限
- **ファイル形式**: 一般的な画像形式（JPEG, PNG, WebP, HEIC, BMP, GIF等）を幅広く対応
- **MIMEタイプチェック**: `image/*` で画像ファイルかどうかを判定
- **エラー表示**: インラインメッセージで即座に通知

#### 1.2 ネットワークエラー
- **接続エラー**: 「接続に失敗しました。しばらく待ってから再試行してください。」
- **タイムアウト**: 「アップロードに時間がかかっています。しばらく待ってください。」
- **サーバーエラー**: 「サーバーでエラーが発生しました。管理者にお問い合わせください。」

### 2. Backend Error Handling

#### 2.1 Lambda Function エラー処理
```javascript
// 統一エラーレスポンス形式
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "ファイルサイズが上限を超えています",
    details: { maxSize: "10MB", actualSize: "15MB" }
  }
}
```

#### 2.2 エラーカテゴリ
- **VALIDATION_ERROR**: 入力値検証エラー
- **UPLOAD_ERROR**: S3アップロードエラー  
- **DATABASE_ERROR**: DynamoDB操作エラー
- **INTERNAL_ERROR**: その他のサーバーエラー

## Testing Strategy

### 1. Frontend Testing

#### 1.1 手動テスト項目
- **ファイルアップロード**
  - 各種ファイル形式での動作確認
  - ファイルサイズ制限の動作確認
  - ドラッグ&ドロップ機能の確認
- **レスポンシブデザイン**
  - モバイル、タブレット、PCでの表示確認
  - 表示切り替え機能の動作確認
- **確認項目機能**
  - チェックボックスの動的生成確認
  - 未チェック時のバリデーション確認

#### 1.2 ブラウザ互換性
- **対象ブラウザ**: Chrome, Safari, Firefox, Edge（最新版）
- **モバイル**: iOS Safari, Android Chrome

### 2. Backend Testing

#### 2.1 Unit Testing
- Lambda関数の個別テスト
- DynamoDB操作のテスト
- S3操作のテスト

#### 2.2 Integration Testing  
- API Gateway + Lambda の結合テスト
- エンドツーエンドのアップロードフロー確認

### 3. Infrastructure Testing

#### 3.1 CDK Testing
- CDK Synthテストでテンプレート生成確認
- リソース作成の成功確認
- 権限設定の適切性確認

## Implementation Notes

### 1. CDK実装のポイント

#### 1.1 初心者向け配慮
- 詳細なコメント付きのCDKコード
- 段階的なリソース作成
- エラーメッセージの日本語化

#### 1.2 ベストプラクティス
- 環境変数での設定管理
- 最小権限の原則
- リソース名の自動生成（重複回避）

### 2. セキュリティ考慮事項

#### 2.1 基本的なセキュリティ
- CORS設定の適切な制限
- ファイル形式の検証
- 入力値のサニタイゼーション

#### 2.2 将来的な拡張
- WAF設定の準備
- CloudTrailログ設定
- 認証機能の追加準備

### 3. パフォーマンス最適化

#### 3.1 画像配信最適化
- CloudFrontでの画像キャッシュ
- 適切なCache-Controlヘッダー設定

#### 3.2 Lambda最適化
- 適切なメモリサイズ設定
- 接続プールの活用
- コールドスタート対策

### 4. 運用考慮事項

#### 4.1 監視・ログ
- CloudWatchでのエラー監視
- Lambda実行ログの出力
- DynamoDB操作ログ

#### 4.2 コスト最適化
- S3ライフサイクルポリシー（将来）
- DynamoDB TTLでの自動削除
- Lambda同時実行数制限