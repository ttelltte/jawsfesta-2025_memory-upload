# フロントエンドをビルドしてS3にデプロイするPowerShellスクリプト
#
# 使用方法:
# .\deploy-frontend.ps1 [環境名] [-Build] [-NoClear] [-NoInvalidate]
#
# 例:
# .\deploy-frontend.ps1 dev
# .\deploy-frontend.ps1 prod -Build
# .\deploy-frontend.ps1 dev -Build -NoClear

param(
    [Parameter(Position=0)]
    [string]$Environment = "dev",
    
    [switch]$Build,
    [switch]$NoClear,
    [switch]$NoInvalidate
)

# エラー時に停止
$ErrorActionPreference = "Stop"

Write-Host "🚀 フロントエンドデプロイスクリプト" -ForegroundColor Green
Write-Host "環境: $Environment" -ForegroundColor Cyan

# Node.js スクリプトのパス
$scriptPath = Join-Path $PSScriptRoot "deploy-frontend.js"

# 引数を構築
$args = @($Environment)

if ($Build) {
    $args += "--build"
}

if ($NoClear) {
    $args += "--no-clear"
}

if ($NoInvalidate) {
    $args += "--no-invalidate"
}

try {
    # Node.js スクリプトを実行
    Write-Host "📋 Node.js スクリプトを実行中..." -ForegroundColor Yellow
    
    & node $scriptPath @args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ デプロイが正常に完了しました。" -ForegroundColor Green
    } else {
        Write-Host "❌ デプロイがエラーで終了しました。" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
} catch {
    Write-Host "❌ スクリプトの実行に失敗しました:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Node.js がインストールされているかチェック
    try {
        $nodeVersion = & node --version
        Write-Host "Node.js バージョン: $nodeVersion" -ForegroundColor Yellow
    } catch {
        Write-Host "⚠️  Node.js がインストールされていない可能性があります。" -ForegroundColor Yellow
        Write-Host "Node.js をインストールしてから再実行してください。" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host ""
Write-Host "💡 ヒント:" -ForegroundColor Cyan
Write-Host "  強制再ビルド: .\deploy-frontend.ps1 $Environment -Build" -ForegroundColor Gray
Write-Host "  S3クリアをスキップ: .\deploy-frontend.ps1 $Environment -NoClear" -ForegroundColor Gray
Write-Host "  CloudFront無効化をスキップ: .\deploy-frontend.ps1 $Environment -NoInvalidate" -ForegroundColor Gray