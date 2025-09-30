# 🚀 独自環境セットアップガイド

このドキュメントは、JAWS FESTA 2025 思い出アップロードプロジェクトをフォークして独自環境でセットアップする手順を説明します。

## 📋 前提条件

### 必要なソフトウェア
- **Node.js**: 18.x 以上
- **npm**: 8.x 以上  
- **AWS CLI**: v2
- **Git**: 最新版

### 必要なAWSアカウント情報
- AWSアカウントID
- IAMユーザーのアクセスキー・シークレットキー
- デプロイ先リージョン（推奨: ap-northeast-1）

## 🛠️ セットアップ手順

### 1. リポジトリのフォークとクローン

```bash
# GitHubでリポジトリをフォーク後、クローン
git clone https://github.com/YOUR_USERNAME/jawsfesta-2025_memory-upload.git
cd jawsfesta-2025_memory-upload
```

### 2. 依存関係のインストール

```bash
# 全プロジェクトの依存関係を一括インストール
npm install
cd infrastructure && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. AWS認証情報の設定

```bash
# AWS CLIの設定
aws configure

# 入力項目
AWS Access Key ID: あなたのアクセスキー
AWS Secret Access Key: あなたのシークレットキー
Default region name: ap-northeast-1
Default output format: json
```

### 4. 環境設定ファイルの編集

#### config/dev.json の編集

```json
{
  "stackName": "YourProjectMemoryUploadDev",
  "environment": "dev",
  "region": "ap-northeast-1",
  "account": "123456789012",  // ← あなたのAWSアカウントID
  "profile": "",
  "domainName": "your-domain.com",  // ← あなたのドメイン（任意）
  "certificateArn": "",  // ← SSL証明書ARN（任意）
  
  "s3": {
    "corsAllowedOrigins": [
      "https://your-domain.com",  // ← あなたのドメイン
      "http://localhost:3000",
      "http://localhost:5173"
    ]
  },
  
  "apiGateway": {
    "corsAllowedOrigins": [
      "https://your-domain.com",  // ← あなたのドメイン
      "http://localhost:3000",
      "http://localhost:5173"
    ]
  },
  
  "tags": {
    "Project": "YourProjectMemoryUpload",  // ← プロジェクト名
    "Owner": "Your-Name",  // ← あなたの名前
    "Repository": "your-repo-name"  // ← リポジトリ名
  }
}
```

### 5. AWSアカウントIDの確認

```bash
# 現在の認証情報とアカウントIDを確認
aws sts get-caller-identity

# 出力例のAccountがアカウントID
{
    "Account": "123456789012",  ← これを設定ファイルに記載
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### 6. CDK Bootstrap（初回のみ）

```bash
cd infrastructure
npx cdk bootstrap aws://123456789012/ap-northeast-1
```

### 7. デプロイ実行

```bash
# インフラストラクチャデプロイ
cd infrastructure
npm run deploy:dev

# 初期データ投入
npm run setup-data:dev

# フロントエンドデプロイ
node scripts/deploy-frontend.js dev --build
```

## 🔧 カスタマイズ

### プロジェクト名の変更
1. `config/dev.json` の `stackName` を変更
2. `package.json` の `name` フィールドを変更
3. README.md のプロジェクト名を変更

### 確認項目のカスタマイズ
`infrastructure/scripts/setup-initial-data.js` で初期データを編集

### 管理者パスワードの設定
`config/dev.json` に以下を追加：
```json
{
  "admin": {
    "password": "your-secure-admin-password"
  }
}
```

**管理者アクセス:**
```
https://your-domain.com?admin=your-secure-admin-password
```

## 🚨 トラブルシューティング

### よくあるエラー

#### 1. 認証エラー
```bash
# AWS認証情報を再設定
aws configure
aws sts get-caller-identity
```

#### 2. 権限エラー
IAMユーザーに `PowerUserAccess` または必要な権限を付与

#### 3. スタック名重複エラー
`config/dev.json` の `stackName` を一意の名前に変更

#### 4. CDK Bootstrap エラー
```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1
```

## 🔒 セキュリティ設定

### 重要なセキュリティ注意事項

⚠️ **絶対にGitにコミットしないでください:**
- 管理者パスワード
- AWSアカウントID
- アクセスキー・シークレットキー
- ドメイン名・証明書ARN

### IAMユーザーの作成（推奨）
ルートユーザーではなく、専用のIAMユーザーを作成

### 最小権限ポリシー
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "s3:*",
                "dynamodb:*",
                "lambda:*",
                "apigateway:*",
                "cloudfront:*",
                "iam:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## 📞 サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. [GitHub Issues](https://github.com/ttelltte/jawsfesta-2025_memory-upload/issues) で質問
3. AWS公式ドキュメントを参照