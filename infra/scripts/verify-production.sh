#!/bin/bash

# Verify Production Deployment
# This script verifies that all production resources are deployed and configured correctly

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
WARN="⚠️"
INFO="ℹ"

echo -e "${RED}${INFO} Verifying Production Deployment${NC}\n"

# Get AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${BLUE}Region: ${AWS_REGION}${NC}\n"

ERRORS=0

# Function to check stack status
check_stack() {
    local stack_name=$1
    echo -n "Checking ${stack_name}... "
    
    if aws cloudformation describe-stacks --stack-name "${stack_name}" --region "${AWS_REGION}" &> /dev/null; then
        local status=$(aws cloudformation describe-stacks \
            --stack-name "${stack_name}" \
            --region "${AWS_REGION}" \
            --query 'Stacks[0].StackStatus' \
            --output text)
        
        if [ "$status" = "CREATE_COMPLETE" ] || [ "$status" = "UPDATE_COMPLETE" ]; then
            echo -e "${GREEN}${CHECK} ${status}${NC}"
            return 0
        else
            echo -e "${RED}${CROSS} ${status}${NC}"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    else
        echo -e "${RED}${CROSS} Not found${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check secret
check_secret() {
    local secret_name=$1
    echo -n "Checking secret ${secret_name}... "
    
    if aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${AWS_REGION}" &> /dev/null; then
        echo -e "${GREEN}${CHECK} Configured${NC}"
        return 0
    else
        echo -e "${RED}${CROSS} Not found${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Check CloudFormation Stacks
echo -e "${BLUE}Checking CloudFormation Stacks:${NC}"
check_stack "TriviaNFT-Security-production"
check_stack "TriviaNFT-Data-production"
check_stack "TriviaNFT-AppConfig-production"
check_stack "TriviaNFT-Api-production"
check_stack "TriviaNFT-Workflow-production"
check_stack "TriviaNFT-Observability-production"
check_stack "TriviaNFT-Web-production"
echo ""

# Check Secrets
echo -e "${BLUE}Checking Secrets Manager:${NC}"
check_secret "trivia-nft/production/jwt-secret"
check_secret "trivia-nft/production/blockfrost-api-key"
check_secret "trivia-nft/production/database"
check_secret "trivia-nft/production/redis"
check_secret "trivia-nft/production/policy-signing-key"
echo ""

# Check API Gateway
echo -e "${BLUE}Checking API Gateway:${NC}"
echo -n "Getting API endpoint... "
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Api-production \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$API_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} ${API_ENDPOINT}${NC}"
    
    echo -n "Testing API health check... "
    if curl -s -f "${API_ENDPOINT}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} API is responding${NC}"
    else
        echo -e "${RED}${CROSS} API is not responding${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}${CROSS} API endpoint not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check CloudFront
echo -e "${BLUE}Checking CloudFront:${NC}"
echo -n "Getting CloudFront domain... "
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Web-production \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo -e "${GREEN}${CHECK} ${CLOUDFRONT_DOMAIN}${NC}"
    
    echo -n "Testing CloudFront distribution... "
    if curl -s -f "https://${CLOUDFRONT_DOMAIN}" > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} CloudFront is serving content${NC}"
    else
        echo -e "${YELLOW}${WARN} CloudFront may not be ready yet${NC}"
    fi
else
    echo -e "${RED}${CROSS} CloudFront domain not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Database
echo -e "${BLUE}Checking Aurora Database:${NC}"
echo -n "Getting database endpoint... "
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-production \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} ${DB_ENDPOINT}${NC}"
    
    echo -n "Checking database cluster status... "
    DB_CLUSTER_ID=$(aws rds describe-db-clusters \
        --region "${AWS_REGION}" \
        --query 'DBClusters[?contains(Endpoint, `'${DB_ENDPOINT}'`)].DBClusterIdentifier' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$DB_CLUSTER_ID" ]; then
        DB_STATUS=$(aws rds describe-db-clusters \
            --db-cluster-identifier "${DB_CLUSTER_ID}" \
            --region "${AWS_REGION}" \
            --query 'DBClusters[0].Status' \
            --output text 2>/dev/null || echo "")
        
        if [ "$DB_STATUS" = "available" ]; then
            echo -e "${GREEN}${CHECK} ${DB_STATUS}${NC}"
        else
            echo -e "${YELLOW}${WARN} ${DB_STATUS}${NC}"
        fi
    else
        echo -e "${YELLOW}${WARN} Could not determine status${NC}"
    fi
else
    echo -e "${RED}${CROSS} Database endpoint not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Redis
echo -e "${BLUE}Checking Redis Cluster:${NC}"
echo -n "Getting Redis endpoint... "
REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Data-production \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$REDIS_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} ${REDIS_ENDPOINT}${NC}"
    
    echo -n "Checking Redis cluster status... "
    REDIS_STATUS=$(aws elasticache describe-replication-groups \
        --region "${AWS_REGION}" \
        --query 'ReplicationGroups[?contains(ConfigurationEndpoint.Address, `'${REDIS_ENDPOINT}'`)].Status' \
        --output text 2>/dev/null || echo "")
    
    if [ "$REDIS_STATUS" = "available" ]; then
        echo -e "${GREEN}${CHECK} ${REDIS_STATUS}${NC}"
    elif [ -n "$REDIS_STATUS" ]; then
        echo -e "${YELLOW}${WARN} ${REDIS_STATUS}${NC}"
    else
        echo -e "${YELLOW}${WARN} Could not determine status${NC}"
    fi
else
    echo -e "${RED}${CROSS} Redis endpoint not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check WAF
echo -e "${BLUE}Checking WAF:${NC}"
echo -n "Checking WAF WebACL... "
WAF_ARN=$(aws cloudformation describe-stacks \
    --stack-name TriviaNFT-Security-production \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebAclArn`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$WAF_ARN" ]; then
    echo -e "${GREEN}${CHECK} Configured${NC}"
else
    echo -e "${RED}${CROSS} WAF not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check AppConfig
echo -e "${BLUE}Checking AppConfig:${NC}"
echo -n "Checking AppConfig application... "
APPCONFIG_APP=$(aws appconfig list-applications \
    --region "${AWS_REGION}" \
    --query 'Items[?Name==`TriviaNFT-production`].Id' \
    --output text 2>/dev/null || echo "")

if [ -n "$APPCONFIG_APP" ]; then
    echo -e "${GREEN}${CHECK} Configured${NC}"
else
    echo -e "${RED}${CROSS} AppConfig not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Lambda Functions
echo -e "${BLUE}Checking Lambda Functions:${NC}"
echo -n "Counting Lambda functions... "
LAMBDA_COUNT=$(aws lambda list-functions \
    --region "${AWS_REGION}" \
    --query 'Functions[?contains(FunctionName, `TriviaNFT-production`)].FunctionName' \
    --output text 2>/dev/null | wc -w || echo "0")

if [ "$LAMBDA_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${CHECK} ${LAMBDA_COUNT} functions deployed${NC}"
else
    echo -e "${RED}${CROSS} No Lambda functions found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Step Functions
echo -e "${BLUE}Checking Step Functions:${NC}"
echo -n "Counting state machines... "
SFN_COUNT=$(aws stepfunctions list-state-machines \
    --region "${AWS_REGION}" \
    --query 'stateMachines[?contains(name, `TriviaNFT-production`)].name' \
    --output text 2>/dev/null | wc -w || echo "0")

if [ "$SFN_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${CHECK} ${SFN_COUNT} state machines deployed${NC}"
else
    echo -e "${RED}${CROSS} No state machines found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check EventBridge Rules
echo -e "${BLUE}Checking EventBridge Rules:${NC}"
echo -n "Counting EventBridge rules... "
EB_COUNT=$(aws events list-rules \
    --region "${AWS_REGION}" \
    --query 'Rules[?contains(Name, `TriviaNFT-production`)].Name' \
    --output text 2>/dev/null | wc -w || echo "0")

if [ "$EB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${CHECK} ${EB_COUNT} rules deployed${NC}"
else
    echo -e "${YELLOW}${WARN} No EventBridge rules found${NC}"
fi
echo ""

# Check CloudWatch Dashboards
echo -e "${BLUE}Checking CloudWatch Dashboards:${NC}"
echo -n "Checking for dashboards... "
DASHBOARD_COUNT=$(aws cloudwatch list-dashboards \
    --region "${AWS_REGION}" \
    --query 'DashboardEntries[?contains(DashboardName, `TriviaNFT-production`)].DashboardName' \
    --output text 2>/dev/null | wc -w || echo "0")

if [ "$DASHBOARD_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${CHECK} ${DASHBOARD_COUNT} dashboards configured${NC}"
else
    echo -e "${YELLOW}${WARN} No dashboards found${NC}"
fi
echo ""

# Check CloudWatch Alarms
echo -e "${BLUE}Checking CloudWatch Alarms:${NC}"
echo -n "Counting alarms... "
ALARM_COUNT=$(aws cloudwatch describe-alarms \
    --region "${AWS_REGION}" \
    --query 'MetricAlarms[?contains(AlarmName, `TriviaNFT-production`)].AlarmName' \
    --output text 2>/dev/null | wc -w || echo "0")

if [ "$ALARM_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${CHECK} ${ALARM_COUNT} alarms configured${NC}"
else
    echo -e "${YELLOW}${WARN} No alarms found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} Production deployment verification PASSED${NC}"
    echo -e "${GREEN}All critical resources are deployed and configured${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Run smoke tests: ./scripts/smoke-test.sh production"
    echo "  2. Test wallet connection with MAINNET wallet"
    echo "  3. Complete a test session"
    echo "  4. Monitor CloudWatch dashboards"
    echo "  5. Verify monitoring alarms are working"
    echo ""
    echo -e "${RED}${WARN} Remember: This is PRODUCTION - monitor closely!${NC}"
    exit 0
else
    echo -e "${RED}${CROSS} Production deployment verification FAILED${NC}"
    echo -e "${RED}Found ${ERRORS} error(s)${NC}"
    echo ""
    echo "Please review the errors above and fix them before proceeding."
    exit 1
fi
