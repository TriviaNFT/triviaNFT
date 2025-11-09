#!/bin/bash

# Smoke Tests for TriviaNFT Staging/Production
# This script runs basic smoke tests to verify the deployment is working

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
TEST="🧪"
WARN="⚠️"

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}${CROSS} Invalid environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}${TEST} Running Smoke Tests for ${ENVIRONMENT}${NC}\n"

# Get endpoints
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$API_ENDPOINT" ] || [ -z "$CLOUDFRONT_DOMAIN" ]; then
    echo -e "${RED}${CROSS} Could not get endpoints${NC}"
    exit 1
fi

echo -e "${BLUE}API Endpoint: ${API_ENDPOINT}${NC}"
echo -e "${BLUE}CloudFront: https://${CLOUDFRONT_DOMAIN}${NC}\n"

ERRORS=0
WARNINGS=0

# Test 1: Frontend is accessible
echo -e "${BLUE}${TEST} Test 1: Frontend Accessibility${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFRONT_DOMAIN}/")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Frontend is accessible (HTTP ${FRONTEND_STATUS})${NC}\n"
else
    echo -e "${RED}${CROSS} Frontend returned HTTP ${FRONTEND_STATUS}${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: API Health Check
echo -e "${BLUE}${TEST} Test 2: API Health Check${NC}"
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/health" || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}${CHECK} API health check passed (HTTP ${API_HEALTH})${NC}\n"
else
    echo -e "${YELLOW}${WARN} API health endpoint returned HTTP ${API_HEALTH}${NC}"
    echo -e "${YELLOW}Note: Health endpoint may not be implemented yet${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 3: Categories Endpoint
echo -e "${BLUE}${TEST} Test 3: Categories Endpoint${NC}"
CATEGORIES_RESPONSE=$(curl -s "${API_ENDPOINT}/categories" || echo "ERROR")
CATEGORIES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/categories" || echo "000")

if [ "$CATEGORIES_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Categories endpoint is accessible${NC}"
    
    # Check if response is valid JSON
    if echo "$CATEGORIES_RESPONSE" | jq empty 2>/dev/null; then
        echo -e "${GREEN}${CHECK} Response is valid JSON${NC}"
        
        # Check if categories exist
        CATEGORY_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
        if [ "$CATEGORY_COUNT" -gt 0 ]; then
            echo -e "${GREEN}${CHECK} Found ${CATEGORY_COUNT} categories${NC}\n"
        else
            echo -e "${YELLOW}${WARN} No categories found - database may need seeding${NC}\n"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}${WARN} Response is not valid JSON${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}${CROSS} Categories endpoint returned HTTP ${CATEGORIES_STATUS}${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Session Start (Guest)
echo -e "${BLUE}${TEST} Test 4: Guest Session Start${NC}"
SESSION_START=$(curl -s -X POST "${API_ENDPOINT}/sessions/start" \
    -H "Content-Type: application/json" \
    -d '{"categoryId":"test-category","anonId":"smoke-test-user"}' \
    -w "\n%{http_code}" || echo "ERROR\n000")

SESSION_STATUS=$(echo "$SESSION_START" | tail -n 1)
SESSION_BODY=$(echo "$SESSION_START" | head -n -1)

if [ "$SESSION_STATUS" = "200" ] || [ "$SESSION_STATUS" = "201" ]; then
    echo -e "${GREEN}${CHECK} Session start endpoint is accessible${NC}"
    
    if echo "$SESSION_BODY" | jq empty 2>/dev/null; then
        echo -e "${GREEN}${CHECK} Response is valid JSON${NC}\n"
    else
        echo -e "${YELLOW}${WARN} Response is not valid JSON${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
elif [ "$SESSION_STATUS" = "400" ] || [ "$SESSION_STATUS" = "404" ]; then
    echo -e "${YELLOW}${WARN} Session start returned HTTP ${SESSION_STATUS}${NC}"
    echo -e "${YELLOW}This is expected if categories are not seeded${NC}\n"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}${CROSS} Session start endpoint returned HTTP ${SESSION_STATUS}${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 5: Leaderboard Endpoint
echo -e "${BLUE}${TEST} Test 5: Leaderboard Endpoint${NC}"
LEADERBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/leaderboard/global" || echo "000")

if [ "$LEADERBOARD_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Leaderboard endpoint is accessible${NC}\n"
elif [ "$LEADERBOARD_STATUS" = "404" ]; then
    echo -e "${YELLOW}${WARN} Leaderboard endpoint returned HTTP ${LEADERBOARD_STATUS}${NC}"
    echo -e "${YELLOW}This may be expected if no season is active${NC}\n"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${RED}${CROSS} Leaderboard endpoint returned HTTP ${LEADERBOARD_STATUS}${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 6: CORS Configuration
echo -e "${BLUE}${TEST} Test 6: CORS Configuration${NC}"
CORS_HEADERS=$(curl -s -I -X OPTIONS "${API_ENDPOINT}/categories" \
    -H "Origin: https://${CLOUDFRONT_DOMAIN}" \
    -H "Access-Control-Request-Method: GET" | grep -i "access-control")

if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}${CHECK} CORS headers are present${NC}"
    echo "$CORS_HEADERS" | while read -r line; do
        echo -e "${BLUE}  ${line}${NC}"
    done
    echo ""
else
    echo -e "${YELLOW}${WARN} CORS headers not found${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 7: CloudWatch Logs
echo -e "${BLUE}${TEST} Test 7: CloudWatch Logs${NC}"
LOG_GROUPS=$(aws logs describe-log-groups \
    --log-group-name-prefix "/aws/lambda/TriviaNFT-Api-${ENVIRONMENT}" \
    --query 'logGroups[*].logGroupName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    LOG_COUNT=$(echo "$LOG_GROUPS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${LOG_COUNT} Lambda log groups${NC}\n"
else
    echo -e "${YELLOW}${WARN} No Lambda log groups found${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 8: CloudWatch Alarms
echo -e "${BLUE}${TEST} Test 8: CloudWatch Alarms${NC}"
ALARMS=$(aws cloudwatch describe-alarms \
    --alarm-name-prefix "TriviaNFT-${ENVIRONMENT}" \
    --query 'MetricAlarms[*].AlarmName' \
    --output text 2>/dev/null || echo "")

if [ -n "$ALARMS" ]; then
    ALARM_COUNT=$(echo "$ALARMS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${ALARM_COUNT} CloudWatch alarms${NC}\n"
else
    echo -e "${YELLOW}${WARN} No CloudWatch alarms found${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 9: Database Connectivity
echo -e "${BLUE}${TEST} Test 9: Database Connectivity${NC}"
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Data-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} Database endpoint: ${DB_ENDPOINT}${NC}"
    echo -e "${YELLOW}Note: Direct connectivity test requires VPC access${NC}\n"
else
    echo -e "${RED}${CROSS} Database endpoint not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 10: Redis Connectivity
echo -e "${BLUE}${TEST} Test 10: Redis Connectivity${NC}"
REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Data-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$REDIS_ENDPOINT" ]; then
    echo -e "${GREEN}${CHECK} Redis endpoint: ${REDIS_ENDPOINT}${NC}"
    echo -e "${YELLOW}Note: Direct connectivity test requires VPC access${NC}\n"
else
    echo -e "${RED}${CROSS} Redis endpoint not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 11: WAF Configuration
echo -e "${BLUE}${TEST} Test 11: WAF Configuration${NC}"
WAF_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Security-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebAclId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$WAF_ID" ]; then
    echo -e "${GREEN}${CHECK} WAF WebACL ID: ${WAF_ID}${NC}\n"
else
    echo -e "${YELLOW}${WARN} WAF WebACL not found${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 12: Secrets Configuration
echo -e "${BLUE}${TEST} Test 12: Secrets Configuration${NC}"
SECRETS=$(aws secretsmanager list-secrets \
    --filters Key=name,Values=trivia-nft/${ENVIRONMENT} \
    --query 'SecretList[*].Name' \
    --output text 2>/dev/null || echo "")

if [ -n "$SECRETS" ]; then
    SECRET_COUNT=$(echo "$SECRETS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${SECRET_COUNT} secrets${NC}"
    echo "$SECRETS" | tr '\t' '\n' | while read -r secret; do
        echo -e "${BLUE}  - ${secret}${NC}"
    done
    echo ""
else
    echo -e "${RED}${CROSS} No secrets found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📊 Test Results:${NC}"
echo -e "  Tests Run: 12"
echo -e "  Errors: ${ERRORS}"
echo -e "  Warnings: ${WARNINGS}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} All critical tests passed!${NC}\n"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}${WARN} ${WARNINGS} warning(s) detected${NC}"
        echo -e "${YELLOW}These are typically expected for a fresh deployment${NC}\n"
    fi
    
    echo -e "${BLUE}📝 Recommended Next Steps:${NC}"
    echo "  1. Seed the database with initial data:"
    echo "     cd ../services/api"
    echo "     pnpm seed:${ENVIRONMENT}"
    echo ""
    echo "  2. Test wallet connection manually:"
    echo "     - Open https://${CLOUDFRONT_DOMAIN}"
    echo "     - Connect a ${ENVIRONMENT} wallet"
    echo "     - Create a profile"
    echo ""
    echo "  3. Run a complete session:"
    echo "     - Select a category"
    echo "     - Answer questions"
    echo "     - Check leaderboard"
    echo ""
    echo "  4. Monitor CloudWatch:"
    echo "     - Check Lambda logs for errors"
    echo "     - Verify metrics are being collected"
    echo "     - Test alarm notifications"
    echo ""
    
    exit 0
else
    echo -e "${RED}${CROSS} ${ERRORS} critical test(s) failed${NC}\n"
    echo -e "${YELLOW}Please review the errors above and fix any issues${NC}\n"
    
    echo -e "${BLUE}🔍 Troubleshooting:${NC}"
    echo "  1. Check CloudFormation stacks are deployed"
    echo "  2. Verify secrets are configured"
    echo "  3. Check Lambda function logs in CloudWatch"
    echo "  4. Verify VPC and security group configuration"
    echo "  5. Ensure database migrations have been run"
    echo ""
    
    exit 1
fi

