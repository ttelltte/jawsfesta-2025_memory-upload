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
- **Notification**: Amazon SNS
- **Infrastructure**: AWS CDK (TypeScript)
- **Build Tool**: Vite (React開発環境)
- **Client Storage**: localStorage（ユーザー名保持用）

### CDK Stack構成

単一のStackで全リソースを管理し、初心者にも理解しやすい構成とします：

```typescript
// MemoryUploadStack
├── S3 Bucket (静的サイト + 画像保存)
├── CloudFront Distribution
├── DynamoDB Table
├── Lambda Functions
├── API Gateway
├── SNS Topic (削除リクエスト通知用)
├── SNS Subscription (Email)
└── IAM Roles & Policies
```

## Components and Interfaces

### 1. Frontend Components

#### 1.1 Upload Component
- **画像アップロード機能**
  - ファイル選択ボタン
  - カメラ撮影ボタン（モバイル対応）
  - 画像プレビュー表示（回転機能付き）
  - コンパクトなアップロードエリア（アルバムを主役にするため）
  - フローティングアップロードボタン（下スクロール時に右下表示）
- **メタデータ入力**
  - 名前入力フィールド（任意）
    - localStorageから保存された名前を自動読み込み
    - 入力時に自動保存（7日間有効）
    - クリアボタンで保存削除
  - コメント入力フィールド（任意）
- **確認項目チェック**
  - 動的に生成されるチェックボックス一覧
  - 拡張されたクリック可能エリア（ラベルテキストと項目全体）
  - 一括選択機能（「全て同意」ボタン）
  - 全項目チェック必須のバリデーション
- **注意事項表示**
  - 「写真はパブリックに公開されます」
  - 「JAWS-UG行動規範に沿った内容ではないと判断した場合、その場で削除・注意をします」
  - 「90日後に自動削除されます」

#### 1.2 Gallery Component
- **画像一覧表示**
  - マソンリーレイアウト（デフォルト）
  - カードグリッドレイアウト
  - 表示切り替えボタン
  - ページネーション（金色 #FFD700 ボタンデザイン）
  - 画像詳細モーダル（金色 #FFD700 の閉じるボタン）
- **削除リクエスト機能**
  - 画像詳細モーダル内に控えめな「削除リクエストを送る」ボタン
  - 削除理由入力ダイアログ（任意）
  - 確認ダイアログ表示
  - 送信成功/失敗のフィードバック
- **レスポンシブデザイン（Tailwind CSS）**
  - モバイル：1列表示
  - タブレット：2-3列表示
  - PC：4-6列表示

#### 1.3 共通コンポーネント
- **Navigation**: React Routerでのページ間移動
- **Loading**: アップロード中の進捗表示
- **Error Handling**: エラーメッセージ表示
- **Layout**: 共通レイアウトコンポーネント
- **FloatingUploadButton**: スクロール時に表示されるフローティングボタン
- **GoldButton**: 統一された金色ボタンコンポーネント（ページネーション、閉じるボタン用）
- **DeleteRequestDialog**: 削除リクエスト送信用ダイアログコンポーネント
- **UserNameStorage**: localStorage管理用ユーティリティ（保存期間7日）

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

**Delete Request Function** (`deleteRequest.js`)
- **役割**: 削除リクエストの受付と通知
- **処理フロー**:
  1. リクエストバリデーション（画像ID、削除理由）
  2. DynamoDBから画像メタデータ取得
  3. Amazon SNSトピックへの通知送信
  4. 通知内容: 画像ID、アップロード者名、削除理由、S3画像URL
  5. レスポンス返却

#### 2.2 API Endpoints

```
GET  /api/photos          - 画像一覧取得
POST /api/upload          - 画像アップロード
GET  /api/config          - 確認項目設定取得
POST /api/delete-request  - 削除リクエスト送信
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

## UI/UX Design Guidelines

### 1. モバイルファーストデザイン

#### 1.1 アップロードエリアの最適化
- **コンパクトデザイン**: アルバム表示を主役にするため、アップロードエリアは最小限に
- **ドラッグ&ドロップ削除**: 操作を簡素化するため完全に削除
- **フローティングボタン**: 下スクロール時に右下に固定表示される円形ボタン
- **既存機能の活用**: 現在のモバイル判定ロジック（window.innerWidth <= 640）を使用

#### 1.2 操作性の向上
- **チェックボックスエリア拡大**: ラベルテキストと項目全体をクリック可能に
- **一括選択機能**: 既存の「全て同意」ボタンを活用
- **タッチターゲットサイズ**: 最小44px×44pxを確保

#### 1.3 デザイン統一
- **金色テーマ**: ページネーション、閉じるボタンに統一された金色（#FFD700）を使用
- **既存スタイルの調整**: 現在のTailwind CSSクラスを金色系に変更
- **ブランドカラー**: JAWS-UGのブランドカラーとの調和

### 2. レスポンシブ対応

#### 2.1 ブレークポイント
```css
/* Tailwind CSS ブレークポイント */
sm: 640px   /* スマートフォン横向き */
md: 768px   /* タブレット */
lg: 1024px  /* PC */
xl: 1280px  /* 大画面PC */
```

#### 2.2 レイアウト調整
- **モバイル**: シングルカラム、フローティングボタン表示
- **タブレット**: 2-3カラム、コンパクトアップロードエリア
- **PC**: 4-6カラム、フルサイズアップロードエリア

## 既存実装との統合ガイドライン

### 1. 既存コンポーネントの活用

#### 1.1 ImageUpload.tsx の拡張
- **現在の実装**: ドラッグ&ドロップエリアは常に表示
- **変更点**: ドラッグ&ドロップ機能を完全削除
- **実装方法**: ファイル選択ボタンとカメラボタンのみに簡素化

#### 1.2 ChecklistForm.tsx の改善
- **現在の実装**: チェックボックスとラベルは既にクリック可能
- **変更点**: ラベル要素全体のクリック可能エリアを拡張
- **実装方法**: 既存の `label` 要素のスタイリングを調整

#### 1.3 HomePage.tsx のページネーション
- **現在の実装**: 青色系のページネーションボタン
- **変更点**: 金色（#FFD700）系のスタイルに変更
- **実装方法**: 既存のTailwind CSSクラスを金色系に置換

#### 1.4 画像詳細モーダルの閉じるボタン
- **現在の実装**: 白色の閉じるボタン
- **変更点**: 金色（#FFD700）系のスタイルに変更
- **実装方法**: 既存のボタンスタイルを金色系に調整

### 2. 新規コンポーネントの追加

#### 2.1 FloatingUploadButton コンポーネント
- **目的**: スクロール時に右下に表示されるフローティングボタン
- **実装**: React Hook（useEffect + useState）でスクロール位置を監視
- **配置**: HomePage.tsx 内に統合

## localStorage Data Structure

### ユーザー名保存

```javascript
{
  key: "jaws-festa-uploader-name",
  value: {
    name: "山田太郎",
    savedAt: 1647072000000,  // Unix timestamp
    expiresAt: 1647676800000 // 7日後のUnix timestamp
  }
}
```

### 保存・取得ロジック

```javascript
// 保存時
const saveUserName = (name) => {
  const now = Date.now();
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7日後
  localStorage.setItem('jaws-festa-uploader-name', JSON.stringify({
    name,
    savedAt: now,
    expiresAt
  }));
};

// 取得時（期限チェック付き）
const getUserName = () => {
  const stored = localStorage.getItem('jaws-festa-uploader-name');
  if (!stored) return null;
  
  const data = JSON.parse(stored);
  if (Date.now() > data.expiresAt) {
    localStorage.removeItem('jaws-festa-uploader-name');
    return null;
  }
  
  return data.name;
};
```

## SNS Notification Structure

### 削除リクエスト通知フォーマット

```json
{
  "Subject": "[JAWS FESTA] 画像削除リクエスト - abc123-def456-ghi789",
  "Message": {
    "requestTime": "2025-03-22T14:30:25+09:00",
    "photoId": "abc123-def456-ghi789",
    "uploaderName": "山田太郎",
    "deleteReason": "誤ってアップロードしました",
    "s3Key": "images/山田太郎_20250322_143025_abc123.jpg",
    "imageUrl": "https://d1234567890.cloudfront.net/images/山田太郎_20250322_143025_abc123.jpg",
    "uploadTime": "2025-03-22T14:30:25+09:00"
  }
}
```

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

#### 1.3 SNS設定
- SNSトピックの作成（削除リクエスト通知用）
- Email Subscriptionの設定（開発者メールアドレス）
- Lambda関数へのSNS Publish権限付与
- トピックARNの環境変数設定

### 2. セキュリティ考慮事項

#### 2.1 基本的なセキュリティ
- CORS設定の適切な制限
- ファイル形式の検証
- 入力値のサニタイゼーション

#### 2.2 将来的な拡張
- WAF設定の準備
- CloudTrailログ設定
- 認証機能の追加準備

#### 2.3 プライバシー保護
- localStorageに保存する情報は名前のみ（個人識別情報は最小限）
- 7日間の自動削除による情報保持期間の制限

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