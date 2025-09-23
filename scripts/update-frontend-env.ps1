# Auto-update frontend environment variables
param(
    [string]$Environment = "dev"
)

Write-Host "Updating frontend environment variables..." -ForegroundColor Yellow

# Build stack name
$stackName = "JawsFestaMemoryUploadDev"
if ($Environment -eq "prod") {
    $stackName = "JawsFestaMemoryUploadProd"
}

try {
    # Get stack outputs from AWS CLI
    Write-Host "Getting URL information from AWS CloudFormation..." -ForegroundColor Cyan
    
    $apiUrl = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
    $websiteUrl = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text
    
    if ([string]::IsNullOrEmpty($apiUrl) -or [string]::IsNullOrEmpty($websiteUrl)) {
        Write-Host "Failed to get stack outputs" -ForegroundColor Red
        Write-Host "Stack name: $stackName" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Retrieved URLs:" -ForegroundColor Green
    Write-Host "   API Gateway: $apiUrl" -ForegroundColor White
    Write-Host "   CloudFront: $websiteUrl" -ForegroundColor White
    
    # Environment file path
    $envFile = "frontend/.env.development"
    if ($Environment -eq "prod") {
        $envFile = "frontend/.env.production"
    }
    
    # Update environment file
    Write-Host "Updating environment file: $envFile" -ForegroundColor Cyan
    
    $envContent = @"
# Auto-generated environment variables for $($Environment.ToUpper())
VITE_API_URL=$apiUrl
VITE_CLOUDFRONT_URL=$websiteUrl
VITE_APP_TITLE=JAWS FESTA 2025 Memory Upload$(if ($Environment -eq "dev") { " (Dev)" })
VITE_ENVIRONMENT=$Environment
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    
    Write-Host "Environment file updated successfully!" -ForegroundColor Green
    Write-Host "File: $envFile" -ForegroundColor White
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}