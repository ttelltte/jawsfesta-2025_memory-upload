#!/bin/bash

# JAWS FESTA Memory Upload - Development Environment Deployment Script
# 開発環境用デプロイメントスクリプト

set -e

echo "🚀 JAWS FESTA Memory Upload - Development Environment Deployment"
echo "================================================================"

# 環境変数の設定
export ENVIRONMENT="dev"
export AWS_PROFILE="default"
export AWS_REGION="ap-northeast-1"

# 設定ファイルの確認
CONFIG_FILE="../config/dev.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file not found: $CONFIG_FILE"
    echo "Please create the configuration file first."
    exit 1
fi

echo "✅ Configuration file found: $CONFIG_FILE"

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

# CDK Deploy
echo "🚀 Deploying to development environment..."
npx cdk deploy \
    --profile $AWS_PROFILE \
    --context environment=$ENVIRONMENT \
    --require-approval never \
    --outputs-file cdk-outputs-dev.json

echo ""
echo "🎉 Deployment completed successfully!"
echo "📋 Deployment outputs have been saved to: cdk-outputs-dev.json"
echo ""
echo "Next steps:"
echo "1. Check the CloudFormation outputs for resource information"
echo "2. Upload initial configuration data to DynamoDB"
echo "3. Build and deploy the frontend application"
echo ""