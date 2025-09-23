# JAWS FESTA Memory Upload - Simple Deploy
param(
    [string]$Environment = "dev"
)

Write-Host "Starting frontend deployment..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan

# Build stack name
$stackName = "JawsFestaMemoryUploadDev"
if ($Environment -eq "prod") {
    $stackName = "JawsFestaMemoryUploadProd"
}

# 1. Auto-update environment variables
Write-Host "Auto-updating environment variables..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File scripts/update-frontend-env.ps1 -Environment $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to update environment variables" -ForegroundColor Red
    exit 1
}

# 2. Get S3 bucket name
Write-Host "Getting S3 bucket name..." -ForegroundColor Yellow
$bucketName = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text

if ([string]::IsNullOrEmpty($bucketName)) {
    Write-Host "Failed to get S3 bucket name" -ForegroundColor Red
    Write-Host "Stack name: $stackName" -ForegroundColor Yellow
    exit 1
}

Write-Host "S3 Bucket: $bucketName" -ForegroundColor Green

# 3. Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 4. Upload to S3
Write-Host "Uploading to S3..." -ForegroundColor Yellow
aws s3 sync dist/ s3://$bucketName --delete --exclude "images/*"

if ($LASTEXITCODE -ne 0) {
    Write-Host "S3 upload failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# 5. Show results
$websiteUrl = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text
Write-Host "Deploy completed!" -ForegroundColor Green
Write-Host "Website URL: $websiteUrl" -ForegroundColor Cyan