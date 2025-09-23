# 環境変数設定ガイド

このドキュメントでは、JAWS FESTA 2025 思い出アップロードプロジェクトの環境変数と設定について詳しく説明します。

## 📋 設定ファイル一覧

| ファイル | 用途 | 必須 |
|---------|------|------|
| `config/dev.json` | 開発環境設定 | ✅ |
| `config/prod.json` | 本番環境設定 | ✅ |
| `~/.aws/credentials` | AWS認証情報 | ✅ |
| `~/.aws/config` | AWS設定 | ✅ |

## 🔧 AWS認証情報の設定

### 方法1: AWS CLI を使用（推奨）

```bash
# デフォルトプロファイルの設定
aws configure

# 入力項目
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: ap-northeast-1
Default output format [None]: json
```

### 方法2: 複数プロファイルの設定

```bash
# 開発環境用
aws configure --profile dev
# 本番環境用
aws configure --profile prod
```

### 方法3: 設定ファイルを直接編集

#### ~/.aws/credentials
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[prod]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

#### ~/.aws/config
```ini
[default]
region = ap-northeast-1
output = json

[profile prod]
region = ap-northeast-1
output = json
```

### 方法4: 環境変数を使用

#### Linux/Mac
```bash
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_PROFILE=default
```

#### Windows PowerShell
```powershell
$env:AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
$env:AWS_DEFAULT_REGION="ap-northeast-1"
$env:AWS_PROFILE="default"
```

#### Windows Command Prompt
```cmd
set AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
set AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
set AWS_DEFAULT_REGION=ap-northeast-1
set AWS_PROFILE=default
```

## ⚙️ 環境設定ファイルの詳細

### config/dev.json（開発環境）

```json
{
  "stackName": "JawsFestaMemoryUploadDev",
  "environment": "dev",
  "region": "ap-northeast-1",
  "account": "123456789012",
  "profile": "default",
  "domainName": "",
  "certificateArn": "",
  
  "s3": {
    "bucketName": "",
    "corsAllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dev.your-domain.com"
    ],
    "presignedUrlExpiry": "3600"
  },
  
  "dynamodb": {
    "photosTableName": "",
    "configTableName": "",
    "ttlDays": 30
  },
  
  "lambda": {
    "runtime": "nodejs18.x",
    "timeout": 30,
    "memorySize": 256
  },
  
  "apiGateway": {
    "corsAllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dev.your-domain.com"
    ],
    "corsAllowedMethods": [
      "GET",
      "POST",
      "OPTIONS"
    ],
    "corsAllowedHeaders": [
      "Content-Type",
      "X-Amz-Date",
      "Authorization",
      "X-Api-Key",
      "X-Amz-Security-Token",
      "X-Requested-With"
    ]
  },
  
  "cloudfront": {
    "priceClass": "PriceClass_200",
    "cachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  
  "upload": {
    "maxFileSize": "10485760",
    "allowedFileTypes": "image/*",
    "ttlDays": "30"
  },
  
  "pagination": {
    "maxItemsPerPage": "50"
  },
  
  "cache": {
    "configTtl": "300"
  },
  
  "logging": {
    "level": "DEBUG"
  },
  
  "tags": {
    "Project": "JawsFestaMemoryUpload",
    "Environment": "dev",
    "Owner": "JAWS-UG",
    "CostCenter": "Development",
    "Repository": "jaws-festa-memory-upload"
  }
}
```

### config/prod.json（本番環境）

```json
{
  "stackName": "JawsFestaMemoryUploadProd",
  "environment": "prod",
  "region": "ap-northeast-1",
  "account": "123456789012",
  "profile": "prod",
  "domainName": "memory.your-domain.com",
  "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
  
  "s3": {
    "bucketName": "",
    "corsAllowedOrigins": [
      "https://memory.your-domain.com"
    ],
    "presignedUrlExpiry": "3600"
  },
  
  "dynamodb": {
    "photosTableName": "",
    "configTableName": "",
    "ttlDays": 30
  },
  
  "lambda": {
    "runtime": "nodejs18.x",
    "timeout": 30,
    "memorySize": 512
  },
  
  "apiGateway": {
    "corsAllowedOrigins": [
      "https://memory.your-domain.com"
    ],
    "corsAllowedMethods": [
      "GET",
      "POST",
      "OPTIONS"
    ],
    "corsAllowedHeaders": [
      "Content-Type",
      "X-Amz-Date",
      "Authorization",
      "X-Api-Key",
      "X-Amz-Security-Token",
      "X-Requested-With"
    ]
  },
  
  "cloudfront": {
    "priceClass": "PriceClass_All",
    "cachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  
  "upload": {
    "maxFileSize": "10485760",
    "allowedFileTypes": "image/*",
    "ttlDays": "30"
  },
  
  "pagination": {
    "maxItemsPerPage": "50"
  },
  
  "cache": {
    "configTtl": "300"
  },
  
  "logging": {
    "level": "WARN"
  },
  
  "tags": {
    "Project": "JawsFestaMemoryUpload",
    "Environment": "prod",
    "Owner": "JAWS-UG",
    "CostCenter": "Production",
    "Repository": "jaws-festa-memory-upload"
  }
}
```

## 📝 設定項目の詳細説明

### 基本設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `stackName` | CloudFormation スタック名 | `JawsFestaMemoryUploadDev` |
| `environment` | 環境名 | `dev`, `prod` |
| `region` | AWS リージョン | `ap-northeast-1` |
| `account` | AWS アカウント ID | `123456789012` |
| `profile` | AWS プロファイル名 | `default`, `prod` |
| `domainName` | カスタムドメイン名（任意） | `memory.example.com` |
| `certificateArn` | SSL証明書のARN（任意） | `arn:aws:acm:...` |

### S3 設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `bucketName` | S3バケット名（空の場合は自動生成） | `""` |
| `corsAllowedOrigins` | CORS許可オリジン | `["https://example.com"]` |
| `presignedUrlExpiry` | Presigned URL の有効期限（秒） | `"3600"` |

### DynamoDB 設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `photosTableName` | 写真テーブル名（空の場合は自動生成） | `""` |
| `configTableName` | 設定テーブル名（空の場合は自動生成） | `""` |
| `ttlDays` | データの自動削除日数 | `30` |

### Lambda 設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `runtime` | Lambda ランタイム | `nodejs18.x` |
| `timeout` | タイムアウト時間（秒） | `30` |
| `memorySize` | メモリサイズ（MB） | `256`, `512` |

### API Gateway 設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `corsAllowedOrigins` | CORS許可オリジン | `["https://example.com"]` |
| `corsAllowedMethods` | CORS許可メソッド | `["GET", "POST", "OPTIONS"]` |
| `corsAllowedHeaders` | CORS許可ヘッダー | `["Content-Type", "Authorization"]` |

### CloudFront 設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `priceClass` | 価格クラス | `PriceClass_200`, `PriceClass_All` |
| `cachePolicyId` | キャッシュポリシーID | `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` |

### アップロード設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `maxFileSize` | 最大ファイルサイズ（バイト） | `"10485760"` (10MB) |
| `allowedFileTypes` | 許可ファイルタイプ | `"image/*"` |
| `ttlDays` | 自動削除日数 | `"30"` |

### その他の設定

| 項目 | 説明 | 例 |
|------|------|-----|
| `pagination.maxItemsPerPage` | 1ページあたりの最大アイテム数 | `"50"` |
| `cache.configTtl` | 設定キャッシュの有効期限（秒） | `"300"` |
| `logging.level` | ログレベル | `"DEBUG"`, `"WARN"` |

## 🔍 設定の確認方法

### AWS認証情報の確認

```bash
# 現在の認証情報を確認
aws sts get-caller-identity

# 設定されているプロファイル一覧
aws configure list-profiles

# 特定のプロファイルの設定確認
aws configure list --profile prod
```

### 設定ファイルの検証

```bash
# JSON ファイルの構文チェック
cd config
node -e "console.log(JSON.parse(require('fs').readFileSync('dev.json', 'utf8')))"

# または jq を使用
cat dev.json | jq .
```

### 環境変数の確認

#### Linux/Mac
```bash
# AWS関連の環境変数を確認
env | grep AWS

# 特定の環境変数を確認
echo $AWS_PROFILE
echo $AWS_DEFAULT_REGION
```

#### Windows PowerShell
```powershell
# AWS関連の環境変数を確認
Get-ChildItem Env: | Where-Object Name -like "AWS*"

# 特定の環境変数を確認
$env:AWS_PROFILE
$env:AWS_DEFAULT_REGION
```

## 🚨 セキュリティ注意事項

### 1. 認証情報の管理

- **絶対にGitにコミットしない**
  - `.gitignore` に以下を追加:
    ```
    .env
    .env.local
    .env.*.local
    config/*-local.json
    **/cdk-outputs-*.json
    ```

- **アクセスキーの定期ローテーション**
  ```bash
  # 新しいアクセスキーを作成
  aws iam create-access-key --user-name your-username
  
  # 古いアクセスキーを削除
  aws iam delete-access-key --user-name your-username --access-key-id OLD_ACCESS_KEY
  ```

### 2. 最小権限の原則

本番環境では必要最小限の権限のみを付与:

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
                "iam:PassRole",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. MFA（多要素認証）の設定

本番環境では MFA を有効にすることを強く推奨:

```bash
# MFA デバイスの設定
aws iam create-virtual-mfa-device --virtual-mfa-device-name your-mfa-device

# MFA を使用したプロファイル設定
# ~/.aws/config
[profile prod-mfa]
source_profile = prod
mfa_serial = arn:aws:iam::123456789012:mfa/your-mfa-device
```

## 🔄 環境の切り替え

### プロファイルベースの切り替え

```bash
# 開発環境
export AWS_PROFILE=default
npm run deploy:dev

# 本番環境
export AWS_PROFILE=prod
npm run deploy:prod
```

### 環境変数ベースの切り替え

```bash
# 開発環境
export ENVIRONMENT=dev
export AWS_PROFILE=default

# 本番環境
export ENVIRONMENT=prod
export AWS_PROFILE=prod
```

## 📚 参考資料

- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [AWS CDK Environment](https://docs.aws.amazon.com/cdk/v2/guide/environments.html)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Credentials and Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)