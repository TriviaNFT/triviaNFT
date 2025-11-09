# Setup script for AWS OIDC with GitHub Actions (PowerShell version)
# This script helps configure AWS IAM roles for GitHub Actions OIDC authentication

Write-Host "=== AWS OIDC Setup for GitHub Actions ===" -ForegroundColor Green

# Check if AWS CLI is installed
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "Error: AWS CLI is not installed" -ForegroundColor Red
    Write-Host "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
}

# Get AWS account ID
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Green

# Get GitHub repository info
$GITHUB_ORG = Read-Host "Enter GitHub organization/username"
$GITHUB_REPO = Read-Host "Enter GitHub repository name"
$GITHUB_REPO_FULL = "$GITHUB_ORG/$GITHUB_REPO"

Write-Host "`nCreating OIDC provider..." -ForegroundColor Yellow

# Check if OIDC provider already exists
$OIDC_PROVIDER_ARN = "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
try {
    aws iam get-open-id-connect-provider --open-id-connect-provider-arn $OIDC_PROVIDER_ARN 2>$null
    Write-Host "OIDC provider already exists" -ForegroundColor Yellow
} catch {
    aws iam create-open-id-connect-provider `
        --url https://token.actions.githubusercontent.com `
        --client-id-list sts.amazonaws.com `
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
    Write-Host "OIDC provider created" -ForegroundColor Green
}

# Create trust policy for staging
$trustPolicyStaging = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO_FULL}:*"
        }
      }
    }
  ]
}
"@

# Create permissions policy
$permissionsPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "rds:*",
        "elasticache:*",
        "secretsmanager:*",
        "iam:GetRole",
        "iam:PassRole",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRolePolicy",
        "cloudfront:*",
        "wafv2:*",
        "logs:*",
        "events:*",
        "states:*",
        "appconfig:*",
        "ec2:*",
        "ssm:*",
        "kms:*"
      ],
      "Resource": "*"
    }
  ]
}
"@

# Save policies to temp files
$trustPolicyStaging | Out-File -FilePath "$env:TEMP\trust-policy-staging.json" -Encoding utf8
$permissionsPolicy | Out-File -FilePath "$env:TEMP\permissions-policy-staging.json" -Encoding utf8

# Create staging role
Write-Host "`nCreating staging IAM role..." -ForegroundColor Yellow
$STAGING_ROLE_NAME = "GitHubActions-TriviaNFT-Staging"

try {
    aws iam get-role --role-name $STAGING_ROLE_NAME 2>$null
    Write-Host "Staging role already exists, updating..." -ForegroundColor Yellow
    aws iam update-assume-role-policy `
        --role-name $STAGING_ROLE_NAME `
        --policy-document "file://$env:TEMP\trust-policy-staging.json"
} catch {
    aws iam create-role `
        --role-name $STAGING_ROLE_NAME `
        --assume-role-policy-document "file://$env:TEMP\trust-policy-staging.json" `
        --description "GitHub Actions role for TriviaNFT staging deployments"
    Write-Host "Staging role created" -ForegroundColor Green
}

# Attach permissions policy
aws iam put-role-policy `
    --role-name $STAGING_ROLE_NAME `
    --policy-name "DeploymentPermissions" `
    --policy-document "file://$env:TEMP\permissions-policy-staging.json"

$STAGING_ROLE_ARN = "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STAGING_ROLE_NAME}"
Write-Host "Staging Role ARN: $STAGING_ROLE_ARN" -ForegroundColor Green

# Clean up temp files
Remove-Item "$env:TEMP\trust-policy-staging.json" -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\permissions-policy-staging.json" -ErrorAction SilentlyContinue

# Output summary
Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "`nAdd the following secrets to your GitHub repository:"
Write-Host "Repository: https://github.com/$GITHUB_REPO_FULL/settings/secrets/actions"
Write-Host ""
Write-Host "Required Secrets:" -ForegroundColor Yellow
Write-Host "AWS_REGION=us-east-1"
Write-Host "AWS_ROLE_ARN_STAGING=$STAGING_ROLE_ARN"
Write-Host ""
Write-Host "Setup script completed successfully!" -ForegroundColor Green
