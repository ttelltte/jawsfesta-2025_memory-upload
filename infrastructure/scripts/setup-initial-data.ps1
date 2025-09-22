# DynamoDB Config テーブルに初期データを投入するPowerShellスクリプト
#
# 使用方法:
# .\setup-initial-data.ps1 [環境名] [-Force] [-Show]
#
# 例:
# .\setup-initial-data.ps1 dev
# .\setup-initial-data.ps1 prod -Force
# .\setup-initial-data.ps1 dev -Show

param(
    [Parameter(Position=0)]
    [string]$Environment = "dev",
    
    [switch]$Force,
    [switch]$Show
)

# エラー時に停止
$ErrorActionPreference = "Stop"

Write-Host "🚀 DynamoDB Config テーブル初期データ投入スクリプト" -ForegroundColor Green
Write-Host "環境: $Environment" -ForegroundColor Cyan

# Node.js スクリプトのパス
$scriptPath = Join-Path $PSScriptRoot "setup-initial-data.js"

# 引数を構築
$args = @($Environment)

if ($Force) {
    $args += "--force"
}

if ($Show) {
    $args += "--show"
}

try {
    # Node.js スクリプトを実行
    Write-Host "📋 Node.js スクリプトを実行中..." -ForegroundColor Yellow
    
    & node $scriptPath @args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ スクリプトが正常に完了しました。" -ForegroundColor Green
    } else {
        Write-Host "❌ スクリプトがエラーで終了しました。" -ForegroundColor Red
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
Write-Host "  現在の設定を確認: .\setup-initial-data.ps1 $Environment -Show" -ForegroundColor Gray
Write-Host "  強制上書き: .\setup-initial-data.ps1 $Environment -Force" -ForegroundColor Gray