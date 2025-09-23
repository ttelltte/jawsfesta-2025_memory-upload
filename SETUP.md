# セットアップガイド

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

## 🚀 初回セットアップ手順

### 1. リポジトリのフォークとクローン

```bash
# GitHubでリポジトリをフォーク後、クローン
git clone https://github.com/YOUR_USERNAME/jawsfesta-2025_memory-upload.git
cd jawsfesta-2025_memory-upload
```

### 2. 依存関係のインストール

```bash
# ルートレベルの依存関係をインストール
npm install

# インフラストラクチャの依存関係をインストール
cd infrastructure
npm install

# フロントエンドの依存関係をインストール
cd ../frontend
npm install

# ルートディレクトリに戻る
cd ..
```

### 3. AWS認証情報の設定

#### 方法1: AWS CLI を使用（推奨）

```bash
# デフォルトプロファイルの設定
aws configure
```

入力項目：
- AWS Access Key ID: `あなたのアクセスキー`
- AWS Secret Access Key: `あなたのシークレットキー`
- Default region name: `ap-northeast-1`
- Default output format: `json`

#### 方法2: 環境変数を使用

```bash
# Linux/Mac の場合
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=ap-northeast-1

# Windows PowerShell の場合
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_DEFAULT_REGION="ap-northeast-1"
```

#### 方法3: 複数環境用のプロファイル設定

```bash
# 開発環境用プロファイル
aws configure
# 本番環境用プロファイル（別アカウントの場合）
aws configure --profile prod
```

### 4. 環境設定ファイルの編集

#### 開発環境設定（config/dev.json）

```bash
# エディタで設定ファイルを開く
code config/dev.json
# または
notepad config/dev.json
```

**必須設定項目：**

```json
{
  "stackName": "YourProjectMemoryUploadDev",
  "environment": "dev",
  "region": "ap-northeast-1",
  "account": "123456789012",  // ← あなたのAWSアカウントID
  "profile": "default",
  "domainName": "",  // 独自ドメインがある場合のみ
  "certificateArn": "",  // SSL証明書がある場合のみ
  
  "s3": {
    "bucketName": "",  // 空の場合は自動生成
    "corsAllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://your-domain.com"  // ← あなたのドメイン
    ]
  },
  
  "apiGateway": {
    "corsAllowedOrigins": [
      "http://localhost:3000", 
      "http://localhost:5173",
      "https://your-domain.com"  // ← あなたのドメイン
    ]
  },
  
  "tags": {
    "Project": "YourProjectMemoryUpload",  // ← プロジェクト名を変更
    "Environment": "dev",
    "Owner": "Your-Name",  // ← あなたの名前
    "Repository": "your-repo-name"  // ← リポジトリ名
  }
}
```

#### 本番環境設定（config/prod.json）

```json
{
  "stackName": "YourProjectMemoryUploadProd",
  "environment": "prod",
  "region": "ap-northeast-1", 
  "account": "123456789012",  // ← あなたのAWSアカウントID
  "profile": "prod",  // または "default"
  "domainName": "your-domain.com",  // ← あなたのドメイン
  
  "s3": {
    "corsAllowedOrigins": [
      "https://your-domain.com"  // ← あなたのドメイン
    ]
  },
  
  "apiGateway": {
    "corsAllowedOrigins": [
      "https://your-domain.com"  // ← あなたのドメイン
    ]
  },
  
  "lambda": {
    "memorySize": 512  // 本番環境では多めに設定
  },
  
  "logging": {
    "level": "WARN"  // 本番環境ではWARN以上のみ
  }
}
```

### 5. AWSアカウントIDの確認

```bash
# 現在の認証情報とアカウントIDを確認
aws sts get-caller-identity

# 出力例:
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012",  ← これがアカウントID
#     "Arn": "arn:aws:iam::123456789012:user/your-username"
# }
```

### 6. CDK Bootstrap（初回のみ）

```bash
cd infrastructure

# デフォルトプロファイルでBootstrap
npx cdk bootstrap

# 特定のプロファイルでBootstrap
npx cdk bootstrap --profile prod

# 特定のアカウント・リージョンでBootstrap
npx cdk bootstrap aws://123456789012/ap-northeast-1
```

## 🚀 デプロイ実行

### 開発環境へのデプロイ

```bash
# Linux/Mac の場合
cd infrastructure
./scripts/deploy-dev.sh

# Windows PowerShell の場合
cd infrastructure
.\scripts\deploy.ps1 -Environment dev
```

### 本番環境へのデプロイ

```bash
# Linux/Mac の場合
cd infrastructure
./scripts/deploy-prod.sh

# Windows PowerShell の場合
cd infrastructure
.\scripts\deploy.ps1 -Environment prod
```

### 初期データの投入

```bash
# 開発環境に初期データを投入
cd infrastructure
npm run setup-data:dev

# Windows PowerShell の場合
.\scripts\setup-initial-data.ps1 dev
```

## 🔧 トラブルシューティング

### よくあるエラーと解決方法

#### 1. 認証エラー

**エラー:** `Unable to locate credentials`

**解決方法:**
```bash
# AWS認証情報を再設定
aws configure

# 認証情報を確認
aws sts get-caller-identity
```

#### 2. 権限エラー

**エラー:** `User: arn:aws:iam::xxx:user/xxx is not authorized to perform: xxx`

**解決方法:**
- IAMユーザーに以下の権限を付与してください：
  - `PowerUserAccess` または
  - カスタムポリシーで必要な権限のみ付与

**最小権限ポリシー例:**
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

#### 3. CDK Bootstrap エラー

**エラー:** `This stack uses assets, so the toolkit stack must be deployed to the environment`

**解決方法:**
```bash
# 正しいアカウント・リージョンでBootstrap
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1
```

#### 4. スタック名の重複エラー

**エラー:** `Stack with id xxx already exists`

**解決方法:**
- `config/dev.json` の `stackName` を一意の名前に変更
- 例: `"stackName": "YourName-MemoryUpload-Dev"`

#### 5. リージョンエラー

**エラー:** `The specified region xxx is not supported`

**解決方法:**
- サポートされているリージョンを使用
- 推奨: `ap-northeast-1` (東京)

#### 6. Node.js バージョンエラー

**エラー:** `Node.js version xxx is not supported`

**解決方法:**
```bash
# Node.js バージョン確認
node --version

# 18.x 以上が必要
# nvm を使用してバージョン管理（推奨）
nvm install 18
nvm use 18
```

### ログの確認方法

```bash
# CloudFormation スタックの状態確認
aws cloudformation describe-stacks --stack-name YourStackName

# Lambda 関数のログ確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/"

# 特定のログストリームを確認
aws logs get-log-events --log-group-name "/aws/lambda/function-name" --log-stream-name "stream-name"
```

## 🔒 セキュリティ設定

### 1. IAM ユーザーの作成（推奨）

ルートユーザーではなく、専用のIAMユーザーを作成することを強く推奨します：

```bash
# AWS CLI でIAMユーザーを作成
aws iam create-user --user-name jawsfesta-deploy-user

# プログラマティックアクセス用のアクセスキーを作成
aws iam create-access-key --user-name jawsfesta-deploy-user

# 必要な権限を付与
aws iam attach-user-policy --user-name jawsfesta-deploy-user --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

### 2. MFA（多要素認証）の設定

本番環境では MFA の設定を強く推奨します。

### 3. アクセスキーの管理

- アクセスキーは定期的にローテーション
- 不要になったアクセスキーは削除
- `.env` ファイルや設定ファイルをGitにコミットしない

## 📝 カスタマイズ

### プロジェクト名の変更

1. `config/dev.json` と `config/prod.json` の `stackName` を変更
2. `package.json` の `name` フィールドを変更
3. README.md のプロジェクト名を変更

### 確認項目のカスタマイズ

`infrastructure/scripts/setup-initial-data.js` で初期データを編集：

```javascript
const configData = {
  PK: 'CONFIG',
  SK: 'UPLOAD_CHECKLIST',
  items: [
    {
      id: 'custom_check',
      text: 'あなたのカスタム確認項目',
      required: true
    }
    // 他の確認項目を追加
  ]
};
```

## 🤝 サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングを確認
2. [GitHub Issues](https://github.com/ttelltte/jawsfesta-2025_memory-upload/issues) で質問
3. AWS公式ドキュメントを参照

## 📚 参考リンク

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/)
- [AWS CLI User Guide](https://docs.aws.amazon.com/cli/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)