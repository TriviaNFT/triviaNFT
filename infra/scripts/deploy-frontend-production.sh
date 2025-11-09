#!/bin/bash

# Deploy TriviaNFT Frontend to Production
# Wrapper script for production frontend deployment with additional safety checks

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
WARN="⚠️"

echo -e "${RED}${ROCKET} Deploying Frontend to PRODUCTION${NC}\n"
echo -e "${RED}${WARN} WARNING: This will deploy to PRODUCTION with MAINNET integration!${NC}\n"

# Check if we're in the infra directory
if [ ! -f "cdk.json" ]; then
    echo -e "${RED}${CROSS} Not in the infra directory${NC}"
    echo "Please run this script from the infra directory"
    exit 1
fi

# Check if production infrastructure is deployed
echo -e "${BLUE}Checking production infrastructure...${NC}"

if ! aws cloudformation describe-stacks --stack-name TriviaNFT-Web-production &> /dev/null; then
    echo -e "${RED}${CROSS} Production infrastructure not deployed${NC}"
    echo ""
    echo "You must deploy the infrastructure first:"
    echo "  ./scripts/deploy-production.sh"
    echo ""
    exit 1
fi
echo -e "${GREEN}${CHECK} Production infrastructure deployed${NC}"

# Check if API stack is deployed
if ! aws cloudformation describe-stacks --stack-name TriviaNFT-Api-production &> /dev/null; then
    echo -e "${RED}${CROSS} Production API stack not deployed${NC}"
    echo ""
    echo "You must deploy the API stack first:"
    echo "  ./scripts/deploy-production.sh"
    echo ""
    exit 1
fi
echo -e "${GREEN}${CHECK} Production API stack deployed${NC}\n"

# Get stack outputs
echo -e "${BLUE}Getting deployment configuration...${NC}"

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text 2>/dev/null)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null)

API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$S3_BUCKET" ] || [ -z "$DISTRIBUTION_ID" ] || [ -z "$API_ENDPOINT" ]; then
    echo -e "${RED}${CROSS} Could not get stack outputs${NC}"
    echo "Make sure the infrastructure is fully deployed"
    exit 1
fi

echo -e "${GREEN}${CHECK} S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${GREEN}${CHECK} Distribution ID: ${DISTRIBUTION_ID}${NC}"
echo -e "${GREEN}${CHECK} CloudFront Domain: ${CLOUDFRONT_DOMAIN}${NC}"
echo -e "${GREEN}${CHECK} API Endpoint: ${API_ENDPOINT}${NC}\n"

# Show deployment summary
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "  Environment: ${RED}PRODUCTION${NC}"
echo -e "  Cardano Network: ${RED}MAINNET${NC}"
echo -e "  S3 Bucket: ${S3_BUCKET}"
echo -e "  CloudFront: https://${CLOUDFRONT_DOMAIN}"
echo -e "  API: ${API_ENDPOINT}"
echo ""

# Final confirmation
echo -e "${RED}${WARN} PRODUCTION DEPLOYMENT CONFIRMATION${NC}"
echo -e "${RED}This will:${NC}"
echo "  1. Build the Expo Web application with MAINNET configuration"
echo "  2. Upload to production S3 bucket"
echo "  3. Invalidate CloudFront cache"
echo "  4. Make the application live to users"
echo ""
echo -e "${RED}Users will be able to:${NC}"
echo "  - Connect MAINNET wallets"
echo "  - Mint NFTs on MAINNET (using real ADA)"
echo "  - Interact with production blockchain"
echo ""
read -p "Type 'DEPLOY FRONTEND TO PRODUCTION' to continue: " -r
echo ""
if [[ ! $REPLY == "DEPLOY FRONTEND TO PRODUCTION" ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Run the actual deployment script
echo -e "${BLUE}${ROCKET} Starting frontend deployment...${NC}\n"

if [ -f "scripts/deploy-frontend.sh" ]; then
    chmod +x scripts/deploy-frontend.sh
    ./scripts/deploy-frontend.sh production
else
    echo -e "${RED}${CROSS} deploy-frontend.sh not found${NC}"
    exit 1
fi

# Verify deployment
echo ""
echo -e "${BLUE}Verifying deployment...${NC}"

# Test HTTP response
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFRONT_DOMAIN}/")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Site is accessible (HTTP ${HTTP_STATUS})${NC}"
else
    echo -e "${YELLOW}${WARN} Site returned HTTP ${HTTP_STATUS}${NC}"
    echo "This might be temporary. Wait a minute and try again."
fi

# Check if PWA verification script exists
if [ -f "scripts/verify-pwa.sh" ]; then
    echo ""
    echo -e "${BLUE}Running PWA verification...${NC}"
    chmod +x scripts/verify-pwa.sh
    ./scripts/verify-pwa.sh production || true
fi

# Success message
echo ""
echo -e "${GREEN}${CHECK} Frontend deployment complete!${NC}\n"

echo -e "${BLUE}🌐 Your application is now live:${NC}"
echo -e "  https://${CLOUDFRONT_DOMAIN}"
echo ""

echo -e "${RED}📝 CRITICAL NEXT STEPS:${NC}"
echo "  1. Test the application in a browser"
echo "     Open: https://${CLOUDFRONT_DOMAIN}"
echo ""
echo "  2. Verify PWA functionality:"
echo "     - Manifest loads correctly"
echo "     - Service worker registers"
echo "     - Install prompt appears"
echo ""
echo "  3. Test wallet connection with MAINNET wallet:"
echo "     - Connect Lace/Nami/Eternl wallet"
echo "     - Verify stake key extraction"
echo "     - Create profile"
echo ""
echo "  4. Test one complete session:"
echo "     - Start a session"
echo "     - Answer questions"
echo "     - Verify results"
echo ""
echo "  5. Run smoke tests:"
echo "     ./scripts/smoke-test.sh production"
echo ""
echo "  6. Monitor CloudWatch dashboards:"
echo "     - Check for errors"
echo "     - Monitor API calls"
echo "     - Watch CloudFront metrics"
echo ""
echo -e "${RED}${WARN} Remember: This is PRODUCTION - monitor closely!${NC}"
echo ""

# Save deployment timestamp
cat > .production-frontend-deployed <<EOF
Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
CloudFront: https://${CLOUDFRONT_DOMAIN}
API: ${API_ENDPOINT}
Cardano: MAINNET
EOF

echo -e "${GREEN}${CHECK} Deployment info saved to .production-frontend-deployed${NC}\n"
