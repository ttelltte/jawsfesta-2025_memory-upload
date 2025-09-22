# ローカルテスト環境を起動するPowerShellスクリプト

Write-Host "🚀 ローカルテスト環境を起動しています..." -ForegroundColor Green
Write-Host ""

Write-Host "1. バックエンドAPIサーバーを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Write-Host ""
Write-Host "2. フロントエンド開発サーバーを起動中..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "3. APIテストを実行中..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node src/test-api.js"

Write-Host ""
Write-Host "✅ ローカルテスト環境が起動しました！" -ForegroundColor Green
Write-Host ""
Write-Host "📱 フロントエンド: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 バックエンドAPI: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🏥 ヘルスチェック: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "📁 アップロード先: backend/uploads/" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 修正内容:" -ForegroundColor Magenta
Write-Host "  - API URLを3001に統一" -ForegroundColor Gray
Write-Host "  - 名前・コメント入力の制約を削除" -ForegroundColor Gray
Write-Host "  - レスポンス形式をフロントエンドに合わせて修正" -ForegroundColor Gray
Write-Host "  - デバッグ用エラー表示を有効化" -ForegroundColor Gray
Write-Host ""
Write-Host "終了するには各PowerShellウィンドウでCtrl+Cを押してください。" -ForegroundColor Yellow
Read-Host "続行するには何かキーを押してください"