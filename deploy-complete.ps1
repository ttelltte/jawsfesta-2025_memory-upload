# 完全自動化デプロイスクリプト
param(
    [string]$Environment = "dev",
    [switch]$SkipInfrastructure
)

Write-Host "🚀 JAWS FESTA Memory Upload - 完全自動デプロイ" -ForegroundColor Green
Write-Host "📋 環境: $Environment" -ForegroundColor Cyan
Write-Host "🏗️ インフラスキップ: $SkipInfrastructure" -ForegroundColor Cyan

# 1. インフラデプロイ（スキップされない場合）
if (-not $SkipInfrastructure) {
    Write-Host "🏗️ インフラストラクチャをデプロイ中..." -ForegroundColor Yellow
    Set-Location infrastructure
    
    if ($Environment -eq "prod") {
        npm run deploy:prod
    } else {
        npm run deploy:dev
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ インフラデプロイに失敗しました" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Set-Location ..
    Write-Host "✅ インフラデプロイ完了" -ForegroundColor Green
}

# 2. 設定ファイルを自動更新
Write-Host "🔧 設定ファイルを自動更新中..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File scripts/update-config.ps1 -Environment $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 設定ファイルの更新に失敗しました" -ForegroundColor Red
    exit 1
}

# 3. 初期データ投入
Write-Host "📊 初期データを投入中..." -ForegroundColor Yellow
Set-Location infrastructure

if ($Environment -eq "prod") {
    npm run setup-data:prod
} else {
    npm run setup-data:dev
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ 初期データ投入に失敗しましたが、続行します" -ForegroundColor Yellow
}

Set-Location ..

# 4. フロントエンドデプロイ
Write-Host "🎨 フロントエンドをデプロイ中..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File deploy.ps1 -Environment $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ フロントエンドデプロイに失敗しました" -ForegroundColor Red
    exit 1
}

# 5. 完了メッセージ
$stackName = "JawsFestaMemoryUploadDev"
if ($Environment -eq "prod") {
    $stackName = "JawsFestaMemoryUploadProd"
}

$websiteUrl = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text
$apiUrl = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text

Write-Host ""
Write-Host "🎉 完全デプロイが完了しました！" -ForegroundColor Green
Write-Host "📋 デプロイ情報:" -ForegroundColor Cyan
Write-Host "   環境: $Environment" -ForegroundColor White
Write-Host "   ウェブサイト: $websiteUrl" -ForegroundColor White
Write-Host "   API: $apiUrl" -ForegroundColor White
Write-Host ""
Write-Host "💡 次回からは以下のコマンドでフロントエンドのみ更新できます:" -ForegroundColor Yellow
Write-Host "   powershell -ExecutionPolicy Bypass -File deploy.ps1 -Environment $Environment" -ForegroundColor White