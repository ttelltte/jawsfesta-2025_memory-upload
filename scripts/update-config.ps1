# Auto-update config file
param(
    [string]$Environment = "dev"
)

Write-Host "Updating config file..." -ForegroundColor Yellow

# Build stack name
$stackName = "JawsFestaMemoryUploadDev"
$configFile = "config/dev.json"
if ($Environment -eq "prod") {
    $stackName = "JawsFestaMemoryUploadProd"
    $configFile = "config/prod.json"
}

try {
    # Get stack outputs from AWS CLI
    Write-Host "Getting configuration from AWS CloudFormation..." -ForegroundColor Cyan
    
    $distributionId = aws cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
    
    if ([string]::IsNullOrEmpty($distributionId)) {
        Write-Host "Failed to get CloudFront Distribution ID" -ForegroundColor Red
        Write-Host "Stack name: $stackName" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "CloudFront Distribution ID: $distributionId" -ForegroundColor Green
    
    # Read config file
    if (Test-Path $configFile) {
        $config = Get-Content $configFile -Raw | ConvertFrom-Json
        
        # Update CloudFront Distribution ID
        $config.cloudFrontDistributionId = $distributionId
        
        # Save config file
        $config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configFile -Encoding UTF8
        
        Write-Host "Config file updated successfully!" -ForegroundColor Green
        Write-Host "File: $configFile" -ForegroundColor White
    } else {
        Write-Host "Config file not found: $configFile" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}