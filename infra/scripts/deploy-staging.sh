#!/bin/bash

# Deploy TriviaNFT Infrastructure to Staging Environment
# This script deploys all CDK stacks to the staging environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
CHECK="✓"
CROSS="✗"
ROCKET="🚀"
WRENCH="🔧"
CLOCK="⏳"
WARN="⚠️"

echo -e "${BLUE}${ROCKET} Deploying TriviaNFT Infrastructure to Staging${NC}\n"

# Check prerequisites
echo -e "${BLUE}${WRENCH} Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}${CROSS} AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi
echo -e "${GREEN}${CHECK} AWS CLI is installed${NC}"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}${CROSS} AWS CDK is not installed${NC}"
    echo "Please install CDK: npm install -g aws-cdk"
    exit 1
fi
echo -e "${GREEN}${CHECK} AWS CDK is installed${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}${CROSS} AWS credentials are not configured${NC}"
    echo "Please configure AWS credentials: aws configure"
    exit 1
fi
echo -e "${GREEN}${CHECK} AWS credentials are configured${NC}"

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${BLUE}  Account: ${AWS_ACCOUNT}${NC}"
echo -e "${BLUE}  Region: ${AWS_REGION}${NC}\n"

# Check if we're in the infra directory
if [ ! -f "cdk.json" ]; then
    echo -e "${RED}${CROSS} Not in the infra directory${NC}"
    echo "Please run this script from the infra directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}${CLOCK} Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}${CHECK} Dependencies installed${NC}\n"
fi

# Build TypeScript
echo -e "${BLUE}${CLOCK} Building TypeScript...${NC}"
pnpm build
echo -e "${GREEN}${CHECK} TypeScript built${NC}\n"

# Bootstrap CDK (if not already done)
echo -e "${BLUE}${CLOCK} Bootstrapping CDK (if needed)...${NC}"
cdk bootstrap aws://${AWS_ACCOUNT}/${AWS_REGION} --context environment=staging || true
echo -e "${GREEN}${CHECK} CDK bootstrapped${NC}\n"

# Synthesize CloudFormation templates
echo -e "${BLUE}${CLOCK} Synthesizing CloudFormation templates...${NC}"
cdk synth --all --context environment=staging
echo -e "${GREEN}${CHECK} Templates synthesized${NC}\n"

# Show what will be deployed
echo -e "${BLUE}${CLOCK} Checking for changes...${NC}"
cdk diff --all --context environment=staging || true
echo ""

# Confirm deployment
echo -e "${YELLOW}${WARN} This will deploy the following stacks to staging:${NC}"
echo "  - TriviaNFT-Security-staging"
echo "  - TriviaNFT-Data-staging"
echo "  - TriviaNFT-AppConfig-staging"
echo "  - TriviaNFT-Api-staging"
echo "  - TriviaNFT-Workflow-staging"
echo "  - TriviaNFT-Observability-staging"
echo "  - TriviaNFT-Web-staging"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy all stacks
echo -e "${BLUE}${ROCKET} Deploying all stacks...${NC}\n"
cdk deploy --all --context environment=staging --require-approval never

echo ""
echo -e "${GREEN}${CHECK} Deployment complete!${NC}\n"

# Get stack outputs
echo -e "${BLUE}📋 Stack Outputs:${NC}\n"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

# Get S3 bucket
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

# Get Distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-staging \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "Not found")

echo -e "${BLUE}API Endpoint:${NC} ${API_ENDPOINT}"
echo -e "${BLUE}CloudFront Domain:${NC} https://${CLOUDFRONT_DOMAIN}"
echo -e "${BLUE}S3 Bucket:${NC} ${S3_BUCKET}"
echo -e "${BLUE}Distribution ID:${NC} ${DISTRIBUTION_ID}"
echo ""

# Save outputs to file
cat > .staging-outputs.json <<EOF
{
  "apiEndpoint": "${API_ENDPOINT}",
  "cloudfrontDomain": "${CLOUDFRONT_DOMAIN}",
  "s3Bucket": "${S3_BUCKET}",
  "distributionId": "${DISTRIBUTION_ID}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}${CHECK} Outputs saved to .staging-outputs.json${NC}\n"

# Next steps
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Configure secrets in AWS Secrets Manager:"
echo "     - JWT secret"
echo "     - Blockfrost API key (preprod)"
echo "     - Database credentials"
echo "     - Redis credentials"
echo "     - Policy signing key"
echo ""
echo "  2. Run database migrations:"
echo "     cd ../services/api"
echo "     pnpm migrate:staging"
echo ""
echo "  3. Deploy frontend:"
echo "     ./scripts/deploy-frontend.sh staging"
echo ""
echo "  4. Run smoke tests:"
echo "     ./scripts/smoke-test.sh staging"
echo ""

