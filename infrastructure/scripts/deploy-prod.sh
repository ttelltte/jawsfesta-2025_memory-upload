#!/bin/bash

# JAWS FESTA Memory Upload - Production Environment Deployment Script
# 本番環境用デプロイメントスクリプト

set -e

echo "🚀 JAWS FESTA Memory Upload - Production Environment Deployment"
echo "=============================================================="

# 環境変数の設定
export ENVIRONMENT="prod"
export AWS_PROFILE="prod"
export AWS_REGION="ap-northeast-1"

# 設定ファイルの確認
CONFIG_FILE="../config/prod.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file not found: $CONFIG_FILE"
    echo "Please create the configuration file first."
    exit 1
fi

echo "✅ Configuration file found: $CONFIG_FILE"

# 本番環境デプロイの確認
echo "⚠️  WARNING: You are about to deploy to PRODUCTION environment!"
echo "Environment: $ENVIRONMENT"
echo "AWS Profile: $AWS_PROFILE"
echo "AWS Region: $AWS_REGION"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled by user"
    exit 1
fi

# AWS認証情報の確認
echo "🔐 Checking AWS credentials..."
aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ AWS credentials are valid"
    aws sts get-caller-identity --profile $AWS_PROFILE
else
    echo "❌ Error: AWS credentials are not configured or invalid"
    echo "Please configure AWS credentials using 'aws configure --profile $AWS_PROFILE'"
    exit 1
fi

# CDK Bootstrap確認
echo "🏗️  Checking CDK Bootstrap..."
ACCOUNT_ID=$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text)
BOOTSTRAP_STACK="CDKToolkit"

aws cloudformation describe-stacks --stack-name $BOOTSTRAP_STACK --profile $AWS_PROFILE --region $AWS_REGION > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ CDK Bootstrap is already configured"
else
    echo "⚠️  CDK Bootstrap not found. Running bootstrap..."
    npx cdk bootstrap aws://$ACCOUNT_ID/$AWS_REGION --profile $AWS_PROFILE
    echo "✅ CDK Bootstrap completed"
fi

# 依存関係のインストール
echo "📦 Installing dependencies..."
npm install

# Lambda関数の依存関係インストール
echo "📦 Installing Lambda dependencies..."
for lambda_dir in lambda/*/; do
    if [ -f "${lambda_dir}package.json" ]; then
        echo "Installing dependencies for ${lambda_dir}"
        (cd "$lambda_dir" && npm install --production)
    fi
done

# CDK Synth（テンプレート生成）
echo "🔧 Synthesizing CDK template..."
npx cdk synth --profile $AWS_PROFILE --context environment=$ENVIRONMENT

# 最終確認
echo ""
echo "⚠️  FINAL CONFIRMATION: Deploying to PRODUCTION"
echo "This will create or update resources in your AWS account."
echo ""
read -p "Type 'DEPLOY' to confirm production deployment: " final_confirm

if [ "$final_confirm" != "DEPLOY" ]; then
    echo "❌ Deployment cancelled by user"
    exit 1
fi

# CDK Deploy
echo "🚀 Deploying to production environment..."
npx cdk deploy \
    --profile $AWS_PROFILE \
    --context environment=$ENVIRONMENT \
    --require-approval never \
    --outputs-file cdk-outputs-prod.json

echo ""
echo "🎉 Production deployment completed successfully!"
echo "📋 Deployment outputs have been saved to: cdk-outputs-prod.json"
echo ""
echo "Next steps:"
echo "1. Verify all resources are created correctly"
echo "2. Upload initial configuration data to DynamoDB"
echo "3. Build and deploy the frontend application"
echo "4. Configure monitoring and alerts"
echo "5. Test the application thoroughly"
echo ""