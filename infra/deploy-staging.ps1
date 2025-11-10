# Clear any existing AWS region environment variables
$env:AWS_REGION = $null
$env:AWS_DEFAULT_REGION = $null

# Set the correct region
$env:CDK_DEFAULT_REGION = "us-east-1"
$env:CDK_DEFAULT_ACCOUNT = "887579662693"

# Display what we're using
Write-Host "Deploying with:" -ForegroundColor Green
Write-Host "  Region: us-east-1"
Write-Host "  Account: 887579662693"
Write-Host "  Profile: AdministratorAccess-887579662693"
Write-Host ""

# Run CDK deploy
cdk deploy --all --context environment=staging --profile AdministratorAccess-887579662693
