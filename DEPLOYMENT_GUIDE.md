# 🚀 JAWS FESTA 2025 思い出アップロード - デプロイガイド

## 📋 概要

このドキュメントは、JAWS FESTA 2025 思い出アップロードプロジェクトのAWSデプロイプロセスの完全ガイドです。

## 🎯 デプロイタイプ

### 1. 初回デプロイ（Full Deploy）
新しい環境への完全デプロイ

### 2. 継続デプロイ（Incremental Deploy）
- フロントエンドのみ
- バックエンドのみ  
- 設定データのみ

## 📋 前提条件

### 必要なソフトウェア
- **Node.js**: 18.x 以上
- **npm**: 8.x 以上
- **AWS CLI**: v2
- **Git**: 最新版

### AWS設定
```bash
# AWS認証情報の確認
aws sts get-caller-identity

# 出力例
{
    "UserId": "AIDA52S24SOFNDXSJHCOP",
    "Account": "950452130698",
    "Arn": "arn:aws:iam::950452130698:user/test-dev-cli-user"
}
```

## 🚀 初回デプロイ手順

### Step 1: 前提条件確認
```bash
# Node.js バージョン確認
node --version  # 18.x 以上

# AWS認証確認
aws sts get-caller-identity

# リージョン確認
aws configure get region  # ap-northeast-1
```

### Step 2: 依存関係インストール
```bash
# ルート依存関係
npm install

# フロントエンド依存関係
cd frontend && npm install && cd ..

# バックエンド依存関係
cd backend && npm install && cd ..

# インフラストラクチャ依存関係
cd infrastructure && npm install && cd ..
```

### Step 3: 設定ファイル確認
```bash
# 開発環境設定確認
cat config/dev.json

# 必要に応じて設定を調整
# - account: AWSアカウントID
# - region: デプロイリージョン
# - profile: AWSプロファイル
```

### Step 4: CDK Bootstrap（初回のみ）
```bash
cd infrastructure
npx cdk bootstrap
```

### Step 5: インフラストラクチャデプロイ
```bash
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

**デプロイ完了時の出力例:**
```
✅  JawsFestaMemoryUploadDev

Outputs:
JawsFestaMemoryUploadDev.ApiGatewayUrl = https://z508wunfnl.execute-api.ap-northeast-1.amazonaws.com/dev/
JawsFestaMemoryUploadDev.CloudFrontDistributionId = E2B3V7FM1IT2W2
JawsFestaMemoryUploadDev.WebsiteUrl = https://d13e8l3unbz1vd.cloudfront.net
```

### Step 6: 初期データ投入
```bash
cd infrastructure
npm run setup-data:dev
```

### Step 7: フロントエンドビルド・デプロイ
```bash
# フロントエンドビルド
cd frontend
npm run build

# S3にデプロイ
cd ../infrastructure
npm run deploy-frontend:dev
```

### Step 8: CloudFrontキャッシュ無効化
```bash
# 設定ファイルにDistribution IDを追加
# config/dev.json に "cloudFrontDistributionId": "E2B3V7FM1IT2W2" を追加

cd infrastructure
npm run cloudfront:invalidate
```

### Step 9: 動作確認
```bash
# API動作確認
curl https://z508wunfnl.execute-api.ap-northeast-1.amazonaws.com/dev/api/config

# ウェブサイトアクセス
# https://d13e8l3unbz1vd.cloudfront.net
```

## 🔄 継続デプロイ手順

### フロントエンドのみ更新
```bash
cd infrastructure
npm run deploy-frontend:build  # ビルド＋デプロイ
npm run cloudfront:invalidate  # キャッシュ無効化
```

### バックエンドのみ更新
```bash
cd infrastructure
npm run build
npx cdk deploy --require-approval never
```

### 設定データのみ更新
```bash
cd infrastructure
npm run setup-data:force  # 強制上書き
```

### 全体更新
```bash
cd infrastructure
npm run deploy:dev
npm run deploy-frontend:build
npm run cloudfront:invalidate
```

## 🌍 環境別デプロイ

### 開発環境（dev）
```bash
export AWS_PROFILE=default
cd infrastructure
npm run deploy:dev
npm run deploy-frontend:dev
```

### 本番環境（prod）
```bash
export AWS_PROFILE=prod
cd infrastructure
npm run deploy:prod
npm run deploy-frontend:prod
```

## 🛠️ 便利なコマンド

### 設定確認
```bash
cd infrastructure
npm run show-config          # 現在の設定表示
npm run show-config:prod     # 本番環境設定表示
```

### CloudFront管理
```bash
cd infrastructure
npm run cloudfront:invalidate     # キャッシュ無効化
npm run cloudfront:status         # 無効化状況確認
npm run cloudfront:tips           # 最適化ヒント表示
```

### スタック管理
```bash
cd infrastructure
npm run diff:dev             # 変更差分確認
npm run synth:dev           # CloudFormationテンプレート生成
npm run destroy:dev         # スタック削除（注意！）
```

## 🚨 トラブルシューティング

### よくあるエラーと解決方法

#### 1. 依存関係エラー
```bash
# エラー: Cannot find module 'esbuild'
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 2. 権限エラー
```bash
# エラー: User is not authorized to perform
# 解決: IAMユーザーに PowerUserAccess 権限を付与
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

#### 3. CDK Bootstrap エラー
```bash
# エラー: This stack uses assets, so the toolkit stack must be deployed
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

#### 4. ファイルロックエラー（Windows）
```bash
# エラー: EPERM: operation not permitted
# 解決: 手動でビルドしてからデプロイ
cd frontend
npm run build
cd ../infrastructure
npm run deploy-frontend:dev
```

#### 5. CloudFrontキャッシュエラー
```bash
# エラー: CloudFront Distribution ID が設定されていません
# 解決: config/dev.json に Distribution ID を追加
{
  "cloudFrontDistributionId": "E2B3V7FM1IT2W2"
}
```

## 📊 デプロイ結果の確認

### 作成されるAWSリソース

| リソース | 用途 | 例 |
|---------|------|-----|
| S3 Bucket | 画像保存・静的サイトホスティング | jawsfestamemoryuploaddev-photosbucket2ac9d1f0-dsxgalzcz168 |
| DynamoDB Tables | データ保存 | Photos, Config |
| Lambda Functions | API処理 | Upload, List, Config |
| API Gateway | REST API | https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev/ |
| CloudFront | CDN | https://xxx.cloudfront.net |

### アクセスURL

- **メインサイト**: https://d13e8l3unbz1vd.cloudfront.net
- **API エンドポイント**: https://z508wunfnl.execute-api.ap-northeast-1.amazonaws.com/dev/
- **S3 Website**: http://jawsfestamemoryuploaddev-photosbucket2ac9d1f0-dsxgalzcz168.s3-website-ap-northeast-1.amazonaws.com

## 🔒 セキュリティ考慮事項

### 認証情報管理
- AWS認証情報をコードにハードコーディングしない
- 環境変数またはAWS CLIプロファイルを使用
- 定期的なアクセスキーローテーション

### 権限設定
- 最小権限の原則を適用
- 本番環境では専用IAMロールを使用
- MFA（多要素認証）の有効化

### ネットワークセキュリティ
- S3バケットのパブリックアクセス制限
- API GatewayのCORS設定
- CloudFrontのアクセス制御

## 📈 パフォーマンス最適化

### ビルド最適化
- 依存関係キャッシュの活用
- 並列ビルドの実行
- 増分ビルドの実装

### デプロイ最適化
- 変更検出による部分デプロイ
- 並列アップロード
- キャッシュ戦略の最適化

### 運用最適化
- CloudWatch監視の設定
- 自動スケーリングの設定
- コスト最適化の実装

## 📞 サポート

### 問題報告
- [GitHub Issues](https://github.com/ttelltte/jawsfesta-2025_memory-upload/issues)
- 問題の詳細、エラーメッセージ、実行環境を記載

### 緊急時対応
1. 即座にサービス停止
2. 問題の影響範囲特定
3. ログの保存
4. 管理者への連絡

## 📚 関連ドキュメント

- [README.md](README.md) - プロジェクト概要
- [SETUP.md](SETUP.md) - 初期セットアップ
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - 環境設定詳細
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - トラブルシューティング詳細

---

**最終更新**: 2025年9月22日  
**バージョン**: 1.0.0