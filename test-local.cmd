@echo off
echo ローカルテスト環境を起動しています...
echo.

echo 1. バックエンドAPIサーバーを起動中...
start "Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo 2. フロントエンド開発サーバーを起動中...
timeout /t 3 /nobreak > nul
start "Frontend Dev" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo 3. APIテストを実行中...
timeout /t 5 /nobreak > nul
start "API Test" cmd /k "cd /d %~dp0backend && node src/test-api.js"

echo.
echo ✅ ローカルテスト環境が起動しました！
echo.
echo 📱 フロントエンド: http://localhost:5173
echo 🔧 バックエンドAPI: http://localhost:3001
echo 🏥 ヘルスチェック: http://localhost:3001/health
echo 📁 アップロード先: backend/uploads/
echo.
echo 🔧 修正内容:
echo   - API URLを3001に統一
echo   - 名前・コメント入力の制約を削除
echo   - レスポンス形式をフロントエンドに合わせて修正
echo   - デバッグ用エラー表示を有効化
echo.
echo 終了するには各ターミナルでCtrl+Cを押してください。
pause