#!/bin/bash

# Verify TriviaNFT Infrastructure Deployment
# This script checks that all resources are properly deployed and configured

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
MAGNIFY="🔍"
WARN="⚠️"

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}${CROSS} Invalid environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}${MAGNIFY} Verifying TriviaNFT Deployment for ${ENVIRONMENT}${NC}\n"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}${CROSS} AWS CLI is not installed${NC}"
    exit 1
fi

AWS_REGION=$(aws configure get region || echo "us-east-1")
ERRORS=0

# Function to check stack status
check_stack() {
    local stack_name=$1
    echo -e "${BLUE}Checking ${stack_name}...${NC}"
    
    local status=$(aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$status" = "CREATE_COMPLETE" ] || [ "$status" = "UPDATE_COMPLETE" ]; then
        echo -e "${GREEN}${CHECK} Stack deployed successfully (${status})${NC}\n"
        return 0
    else
        echo -e "${RED}${CROSS} Stack status: ${status}${NC}\n"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Check all stacks
echo -e "${BLUE}📦 Checking CloudFormation Stacks${NC}\n"

check_stack "TriviaNFT-Security-${ENVIRONMENT}"
check_stack "TriviaNFT-Data-${ENVIRONMENT}"
check_stack "TriviaNFT-AppConfig-${ENVIRONMENT}"
check_stack "TriviaNFT-Api-${ENVIRONMENT}"
check_stack "TriviaNFT-Workflow-${ENVIRONMENT}"
check_stack "TriviaNFT-Observability-${ENVIRONMENT}"
check_stack "TriviaNFT-Web-${ENVIRONMENT}"

# Check secrets
echo -e "${BLUE}🔑 Checking Secrets Manager${NC}\n"

check_secret() {
    local secret_name=$1
    echo -e "${BLUE}Checking ${secret_name}...${NC}"
    
    if aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${AWS_REGION}" &> /dev/null; then
        echo -e "${GREEN}${CHECK} Secret exists${NC}\n"
        return 0
    else
        echo -e "${RED}${CROSS} Secret not found${NC}\n"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_secret "trivia-nft/${ENVIRONMENT}/jwt-secret"
check_secret "trivia-nft/${ENVIRONMENT}/blockfrost-api-key"
check_secret "trivia-nft/${ENVIRONMENT}/database"
check_secret "trivia-nft/${ENVIRONMENT}/redis"

# Check API Gateway
echo -e "${BLUE}🌐 Checking API Gateway${NC}\n"

API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$API_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} API Endpoint: ${API_ENDPOINT}${NC}\n"
else
    echo -e "${RED}${CROSS} API Endpoint not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check CloudFront
echo -e "${BLUE}☁️ Checking CloudFront Distribution${NC}\n"

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null || echo "")

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_DOMAIN" ] && [ -n "$DISTRIBUTION_ID" ]; then
    echo -e "${GREEN}${CHECK} CloudFront Domain: https://${CLOUDFRONT_DOMAIN}${NC}"
    echo -e "${GREEN}${CHECK} Distribution ID: ${DISTRIBUTION_ID}${NC}\n"
    
    # Check distribution status
    DIST_STATUS=$(aws cloudfront get-distribution \
        --id "${DISTRIBUTION_ID}" \
        --query 'Distribution.Status' \
        --output text 2>/dev/null || echo "UNKNOWN")
    
    if [ "$DIST_STATUS" = "Deployed" ]; then
        echo -e "${GREEN}${CHECK} Distribution is deployed${NC}\n"
    else
        echo -e "${YELLOW}${WARN} Distribution status: ${DIST_STATUS}${NC}\n"
    fi
else
    echo -e "${RED}${CROSS} CloudFront distribution not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check VPC and networking
echo -e "${BLUE}🌐 Checking VPC and Networking${NC}\n"

VPC_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Data-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$VPC_ID" ]; then
    echo -e "${GREEN}${CHECK} VPC ID: ${VPC_ID}${NC}\n"
else
    echo -e "${RED}${CROSS} VPC not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check Aurora cluster
echo -e "${BLUE}🗄️ Checking Aurora Database${NC}\n"

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Data-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} Database Endpoint: ${DB_ENDPOINT}${NC}\n"
else
    echo -e "${RED}${CROSS} Database endpoint not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check Redis cluster
echo -e "${BLUE}💾 Checking Redis Cluster${NC}\n"

REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Data-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$REDIS_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} Redis Endpoint: ${REDIS_ENDPOINT}${NC}\n"
else
    echo -e "${RED}${CROSS} Redis endpoint not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check AppConfig
echo -e "${BLUE}⚙️ Checking AppConfig${NC}\n"

APPCONFIG_APP=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-AppConfig-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApplicationId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$APPCONFIG_APP" ]; then
    echo -e "${GREEN}${CHECK} AppConfig Application ID: ${APPCONFIG_APP}${NC}\n"
else
    echo -e "${RED}${CROSS} AppConfig application not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} All checks passed!${NC}\n"
    
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo -e "  Environment: ${ENVIRONMENT}"
    echo -e "  Region: ${AWS_REGION}"
    echo -e "  API Endpoint: ${API_ENDPOINT}"
    echo -e "  CloudFront: https://${CLOUDFRONT_DOMAIN}"
    echo -e "  Database: ${DB_ENDPOINT}"
    echo -e "  Redis: ${REDIS_ENDPOINT}"
    echo ""
    
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo "  1. Run database migrations"
    echo "  2. Deploy frontend application"
    echo "  3. Run smoke tests"
    echo ""
    
    exit 0
else
    echo -e "${RED}${CROSS} ${ERRORS} check(s) failed${NC}\n"
    echo -e "${YELLOW}Please review the errors above and fix any issues${NC}\n"
    exit 1
fi

