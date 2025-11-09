#!/bin/bash

# Deploy TriviaNFT Frontend to Staging/Production
# This script builds the Expo Web app and deploys it to S3/CloudFront

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Emojis
CHECK="✓"
CROSS="✗"
ROCKET="🚀"
BUILD="🔨"
UPLOAD="📤"
CLOUD="☁️"
WARN="⚠️"

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}${CROSS} Invalid environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}${ROCKET} Deploying Frontend to ${ENVIRONMENT}${NC}\n"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}${CROSS} AWS CLI is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}${CHECK} AWS CLI is installed${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}${CROSS} pnpm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}${CHECK} pnpm is installed${NC}\n"

# Get stack outputs
echo -e "${BLUE}Getting deployment configuration...${NC}"

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text 2>/dev/null)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null)

API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$S3_BUCKET" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${RED}${CROSS} Could not get stack outputs${NC}"
    echo "Make sure the infrastructure is deployed first"
    exit 1
fi

echo -e "${GREEN}${CHECK} S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${GREEN}${CHECK} Distribution ID: ${DISTRIBUTION_ID}${NC}"
echo -e "${GREEN}${CHECK} CloudFront Domain: ${CLOUDFRONT_DOMAIN}${NC}"
echo -e "${GREEN}${CHECK} API Endpoint: ${API_ENDPOINT}${NC}\n"

# Navigate to web app directory
cd ../apps/web

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}${CROSS} Not in the web app directory${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}${CHECK} Dependencies installed${NC}\n"
fi

# Create environment file
echo -e "${BLUE}Creating environment configuration...${NC}"

CARDANO_NETWORK="preprod"
if [ "$ENVIRONMENT" = "production" ]; then
    CARDANO_NETWORK="mainnet"
fi

cat > .env.production <<EOF
# API Configuration
EXPO_PUBLIC_API_URL=${API_ENDPOINT}
EXPO_PUBLIC_API_TIMEOUT=30000

# Cardano Network
EXPO_PUBLIC_CARDANO_NETWORK=${CARDANO_NETWORK}

# Feature Flags
EXPO_PUBLIC_ENABLE_WALLET_CONNECT=true
EXPO_PUBLIC_ENABLE_GUEST_MODE=true

# Environment
EXPO_PUBLIC_ENV=${ENVIRONMENT}
EOF

echo -e "${GREEN}${CHECK} Environment configured${NC}\n"

# Build the application
echo -e "${BLUE}${BUILD} Building Expo Web application...${NC}"
pnpm build

if [ ! -d "dist" ]; then
    echo -e "${RED}${CROSS} Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}${CHECK} Build complete${NC}\n"

# Verify build output
echo -e "${BLUE}Verifying build output...${NC}"
BUILD_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}${CHECK} Build size: ${BUILD_SIZE}${NC}\n"

# Upload to S3
echo -e "${BLUE}${UPLOAD} Uploading to S3...${NC}"

aws s3 sync dist/ "s3://${S3_BUCKET}/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "manifest.json" \
    --exclude "service-worker.js"

# Upload HTML files with shorter cache
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
    --exclude "*" \
    --include "*.html" \
    --include "manifest.json" \
    --include "service-worker.js" \
    --cache-control "public, max-age=0, must-revalidate"

echo -e "${GREEN}${CHECK} Upload complete${NC}\n"

# Invalidate CloudFront cache
echo -e "${BLUE}${CLOUD} Invalidating CloudFront cache...${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "${DISTRIBUTION_ID}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}${CHECK} Invalidation created: ${INVALIDATION_ID}${NC}"
echo -e "${BLUE}Waiting for invalidation to complete...${NC}"

aws cloudfront wait invalidation-completed \
    --distribution-id "${DISTRIBUTION_ID}" \
    --id "${INVALIDATION_ID}"

echo -e "${GREEN}${CHECK} Invalidation complete${NC}\n"

# Test the deployment
echo -e "${BLUE}Testing deployment...${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFRONT_DOMAIN}/")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Site is accessible (HTTP ${HTTP_STATUS})${NC}\n"
else
    echo -e "${YELLOW}${WARN} Site returned HTTP ${HTTP_STATUS}${NC}\n"
fi

# Summary
echo -e "${GREEN}${CHECK} Deployment complete!${NC}\n"

echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "  Environment: ${ENVIRONMENT}"
echo -e "  S3 Bucket: ${S3_BUCKET}"
echo -e "  CloudFront: https://${CLOUDFRONT_DOMAIN}"
echo -e "  API Endpoint: ${API_ENDPOINT}"
echo -e "  Cardano Network: ${CARDANO_NETWORK}"
echo -e "  Build Size: ${BUILD_SIZE}"
echo ""

echo -e "${BLUE}🌐 Access your application:${NC}"
echo -e "  https://${CLOUDFRONT_DOMAIN}"
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Test the application in a browser"
echo "  2. Verify PWA functionality (install prompt)"
echo "  3. Test wallet connection"
echo "  4. Run smoke tests"
echo ""

# Save deployment info
cd ../../infra
cat > ".${ENVIRONMENT}-frontend-deployment.json" <<EOF
{
  "environment": "${ENVIRONMENT}",
  "s3Bucket": "${S3_BUCKET}",
  "cloudfrontDomain": "${CLOUDFRONT_DOMAIN}",
  "distributionId": "${DISTRIBUTION_ID}",
  "apiEndpoint": "${API_ENDPOINT}",
  "cardanoNetwork": "${CARDANO_NETWORK}",
  "buildSize": "${BUILD_SIZE}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}${CHECK} Deployment info saved to .${ENVIRONMENT}-frontend-deployment.json${NC}\n"

