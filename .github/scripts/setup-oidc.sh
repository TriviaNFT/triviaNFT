#!/bin/bash

# Setup script for AWS OIDC with GitHub Actions
# This script helps configure AWS IAM roles for GitHub Actions OIDC authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AWS OIDC Setup for GitHub Actions ===${NC}\n"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}\n"

# Get GitHub repository info
read -p "Enter GitHub organization/username: " GITHUB_ORG
read -p "Enter GitHub repository name: " GITHUB_REPO
GITHUB_REPO_FULL="${GITHUB_ORG}/${GITHUB_REPO}"

echo -e "\n${YELLOW}Creating OIDC provider...${NC}"

# Check if OIDC provider already exists
OIDC_PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" &> /dev/null; then
    echo -e "${YELLOW}OIDC provider already exists${NC}"
else
    aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
    echo -e "${GREEN}OIDC provider created${NC}"
fi

# Create trust policy
create_trust_policy() {
    local env=$1
    cat > "/tmp/trust-policy-${env}.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_PROVIDER_ARN}"
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
EOF
}

# Create permissions policy
create_permissions_policy() {
    local env=$1
    cat > "/tmp/permissions-policy-${env}.json" <<EOF
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
EOF
}

# Create staging role
echo -e "\n${YELLOW}Creating staging IAM role...${NC}"
STAGING_ROLE_NAME="GitHubActions-TriviaNFT-Staging"
create_trust_policy "staging"
create_permissions_policy "staging"

if aws iam get-role --role-name "$STAGING_ROLE_NAME" &> /dev/null; then
    echo -e "${YELLOW}Staging role already exists, updating...${NC}"
    aws iam update-assume-role-policy \
        --role-name "$STAGING_ROLE_NAME" \
        --policy-document "file:///tmp/trust-policy-staging.json"
else
    aws iam create-role \
        --role-name "$STAGING_ROLE_NAME" \
        --assume-role-policy-document "file:///tmp/trust-policy-staging.json" \
        --description "GitHub Actions role for TriviaNFT staging deployments"
    echo -e "${GREEN}Staging role created${NC}"
fi

# Attach permissions policy
aws iam put-role-policy \
    --role-name "$STAGING_ROLE_NAME" \
    --policy-name "DeploymentPermissions" \
    --policy-document "file:///tmp/permissions-policy-staging.json"

STAGING_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STAGING_ROLE_NAME}"
echo -e "${GREEN}Staging Role ARN: ${STAGING_ROLE_ARN}${NC}"

# Create production role
echo -e "\n${YELLOW}Creating production IAM role...${NC}"
PRODUCTION_ROLE_NAME="GitHubActions-TriviaNFT-Production"
create_trust_policy "production"
create_permissions_policy "production"

if aws iam get-role --role-name "$PRODUCTION_ROLE_NAME" &> /dev/null; then
    echo -e "${YELLOW}Production role already exists, updating...${NC}"
    aws iam update-assume-role-policy \
        --role-name "$PRODUCTION_ROLE_NAME" \
        --policy-document "file:///tmp/trust-policy-production.json"
else
    aws iam create-role \
        --role-name "$PRODUCTION_ROLE_NAME" \
        --assume-role-policy-document "file:///tmp/trust-policy-production.json" \
        --description "GitHub Actions role for TriviaNFT production deployments"
    echo -e "${GREEN}Production role created${NC}"
fi

# Attach permissions policy
aws iam put-role-policy \
    --role-name "$PRODUCTION_ROLE_NAME" \
    --policy-name "DeploymentPermissions" \
    --policy-document "file:///tmp/permissions-policy-production.json"

PRODUCTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PRODUCTION_ROLE_NAME}"
echo -e "${GREEN}Production Role ARN: ${PRODUCTION_ROLE_ARN}${NC}"

# Clean up temp files
rm -f /tmp/trust-policy-*.json /tmp/permissions-policy-*.json

# Output summary
echo -e "\n${GREEN}=== Setup Complete ===${NC}\n"
echo "Add the following secrets to your GitHub repository:"
echo "Repository: https://github.com/${GITHUB_REPO_FULL}/settings/secrets/actions"
echo ""
echo -e "${YELLOW}Required Secrets:${NC}"
echo "AWS_REGION=us-east-1"
echo "AWS_ROLE_ARN_STAGING=${STAGING_ROLE_ARN}"
echo "AWS_ROLE_ARN_PRODUCTION=${PRODUCTION_ROLE_ARN}"
echo ""
echo -e "${YELLOW}After deploying infrastructure, add:${NC}"
echo "STAGING_API_URL=<API Gateway URL>"
echo "STAGING_S3_BUCKET=<S3 bucket name>"
echo "STAGING_CLOUDFRONT_DISTRIBUTION_ID=<CloudFront distribution ID>"
echo "PRODUCTION_API_URL=<API Gateway URL>"
echo "PRODUCTION_S3_BUCKET=<S3 bucket name>"
echo "PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID=<CloudFront distribution ID>"
echo ""
echo -e "${GREEN}Setup script completed successfully!${NC}"
