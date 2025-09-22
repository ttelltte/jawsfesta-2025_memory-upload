# JAWS FESTA Memory Upload - PowerShell Deployment Script
# Windows用デプロイメントスクリプト

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment,
    
    [string]$Profile = "default",
    [string]$Region = "ap-northeast-1"
)

# エラー時に停止
$ErrorActionPreference = "Stop"

Write-Host "🚀 JAWS FESTA Memory Upload - $Environment Environment Deployment" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# 環境変数の設定
$env:ENVIRONMENT = $Environment
$env:AWS_PROFILE = if ($Environment -eq "prod") { "prod" } else { $Profile }
$env:AWS_REGION = $Region

# 設定ファイルの確認
$ConfigFile = "../config/$Environment.json"
if (-not (Test-Path $ConfigFile)) {
    Write-Host "❌ Error: Configuration file not found: $ConfigFile" -ForegroundColor Red
    Write-Host "Please create the configuration file first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuration file found: $ConfigFile" -ForegroundColor Green

# 本番環境の場合は確認
if ($Environment -eq "prod") {
    Write-Host "⚠️  WARNING: You are about to deploy to PRODUCTION environment!" -ForegroundColor Yellow
    Write-Host "Environment: $Environment" -ForegroundColor Yellow
    Write-Host "AWS Profile: $env:AWS_PROFILE" -ForegroundColor Yellow
    Write-Host "AWS Region: $env:AWS_REGION" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Deployment cancelled by user" -ForegroundColor Red
        exit 1
    }
}

# AWS認証情報の確認
Write-Host "🔐 Checking AWS credentials..." -ForegroundColor Blue
try {
    $identity = aws sts get-caller-identity --profile $env:AWS_PROFILE --output json | ConvertFrom-Json
    Write-Host "✅ AWS credentials are valid" -ForegroundColor Green
    Write-Host "Account: $($identity.Account)" -ForegroundColor Cyan
    Write-Host "User: $($identity.Arn)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error: AWS credentials are not configured or invalid" -ForegroundColor Red
    Write-Host "Please configure AWS credentials using 'aws configure --profile $env:AWS_PROFILE'" -ForegroundColor Red
    exit 1
}

# CDK Bootstrap確認
Write-Host "🏗️  Checking CDK Bootstrap..." -ForegroundColor Blue
$AccountId = $identity.Account
$BootstrapStack = "CDKToolkit"

try {
    aws cloudformation describe-stacks --stack-name $BootstrapStack --profile $env:AWS_PROFILE --region $env:AWS_REGION --output json | Out-Null
    Write-Host "✅ CDK Bootstrap is already configured" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  CDK Bootstrap not found. Running bootstrap..." -ForegroundColor Yellow
    npx cdk bootstrap "aws://$AccountId/$env:AWS_REGION" --profile $env:AWS_PROFILE
    Write-Host "✅ CDK Bootstrap completed" -ForegroundColor Green
}

# 依存関係のインストール
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Lambda関数の依存関係インストール
Write-Host "📦 Installing Lambda dependencies..." -ForegroundColor Blue
Get-ChildItem -Path "lambda" -Directory | ForEach-Object {
    $packageJsonPath = Join-Path $_.FullName "package.json"
    if (Test-Path $packageJsonPath) {
        Write-Host "Installing dependencies for $($_.Name)" -ForegroundColor Cyan
        Push-Location $_.FullName
        npm install --production
        Pop-Location
    }
}

# CDK Synth（テンプレート生成）
Write-Host "🔧 Synthesizing CDK template..." -ForegroundColor Blue
npx cdk synth --profile $env:AWS_PROFILE --context environment=$Environment

# 本番環境の場合は最終確認
if ($Environment -eq "prod") {
    Write-Host ""
    Write-Host "⚠️  FINAL CONFIRMATION: Deploying to PRODUCTION" -ForegroundColor Yellow
    Write-Host "This will create or update resources in your AWS account." -ForegroundColor Yellow
    Write-Host ""
    
    $finalConfirm = Read-Host "Type 'DEPLOY' to confirm production deployment"
    if ($finalConfirm -ne "DEPLOY") {
        Write-Host "❌ Deployment cancelled by user" -ForegroundColor Red
        exit 1
    }
}

# CDK Deploy
Write-Host "🚀 Deploying to $Environment environment..." -ForegroundColor Blue
npx cdk deploy `
    --profile $env:AWS_PROFILE `
    --context environment=$Environment `
    --require-approval never `
    --outputs-file "cdk-outputs-$Environment.json"

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "📋 Deployment outputs have been saved to: cdk-outputs-$Environment.json" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check the CloudFormation outputs for resource information" -ForegroundColor White
Write-Host "2. Upload initial configuration data to DynamoDB" -ForegroundColor White
Write-Host "3. Build and deploy the frontend application" -ForegroundColor White
if ($Environment -eq "prod") {
    Write-Host "4. Configure monitoring and alerts" -ForegroundColor White
    Write-Host "5. Test the application thoroughly" -ForegroundColor White
}
Write-Host ""