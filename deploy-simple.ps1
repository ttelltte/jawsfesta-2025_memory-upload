# シンプルデプロイスクリプト
Write-Host "🚀 JAWS FESTA Memory Upload - シンプルデプロイ" -ForegroundColor Green

# S3バケット名を取得
Write-Host "📦 S3バケット名を取得中..." -ForegroundColor Yellow
$bucketName = aws cloudformation describe-stacks --stack-name JawsFestaMemoryUploadDev --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text

if (($LASTEXITCODE -ne 0) -or ([string]::IsNullOrEmpty($bucketName))) {
    Write-Host "❌ S3バケット名の取得に失敗しました。CDKデプロイを先に実行してください。" -ForegroundColor Red
    Write-Host "実行コマンド: cd infrastructure; npm run deploy:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ S3バケット: $bucketName" -ForegroundColor Green

# フロントエンドビルド
Write-Host "🔨 フロントエンドをビルド中..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ フロントエンドのビルドに失敗しました" -ForegroundColor Red
    exit 1
}

# S3にアップロード
Write-Host "☁️ S3にアップロード中..." -ForegroundColor Yellow
aws s3 sync dist/ s3://$bucketName --delete --exclude "images/*"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3アップロードに失敗しました" -ForegroundColor Red
    exit 1
}

# CloudFrontキャッシュ無効化
Write-Host "🔄 CloudFrontキャッシュを無効化中..." -ForegroundColor Yellow
$distributionId = aws cloudformation describe-stacks --stack-name JawsFestaMemoryUploadDev --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
if (-not [string]::IsNullOrEmpty($distributionId)) {
    aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"
    Write-Host "✅ CloudFrontキャッシュ無効化を開始しました" -ForegroundColor Green
} else {
    Write-Host "⚠️ CloudFront Distribution IDが見つかりません" -ForegroundColor Yellow
}

Set-Location ..
Write-Host "🎉 デプロイ完了！" -ForegroundColor Green

# 結果表示
$websiteUrl = aws cloudformation describe-stacks --stack-name JawsFestaMemoryUploadDev --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text
if (-not [string]::IsNullOrEmpty($websiteUrl)) {
    Write-Host "🌐 ウェブサイトURL: $websiteUrl" -ForegroundColor Cyan
}