# フロントエンドビルド＆デプロイスクリプト
param(
    [string]$Environment = "dev"
)

Write-Host "🚀 フロントエンドビルド＆デプロイ開始" -ForegroundColor Green
Write-Host "環境: $Environment" -ForegroundColor Cyan
Write-Host ""

# 1. frontendディレクトリでビルド
Write-Host "📦 フロントエンドをビルド中..." -ForegroundColor Yellow
Set-Location frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ ビルド完了" -ForegroundColor Green
Write-Host ""

# 2. infrastructureディレクトリでデプロイ
Write-Host "☁️  S3にデプロイ中..." -ForegroundColor Yellow
Set-Location ../infrastructure
node scripts/deploy-frontend.js $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ デプロイに失敗しました" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 3. ルートディレクトリに戻る
Set-Location ..

Write-Host ""
Write-Host "🎉 デプロイ完了！" -ForegroundColor Green
