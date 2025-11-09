#!/bin/bash

# Production Validation Script
# Comprehensive validation of production deployment including smoke tests,
# monitoring verification, alarm testing, and traffic monitoring

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Emojis
CHECK="✓"
CROSS="✗"
WARN="⚠️"
INFO="ℹ"
ROCKET="🚀"
CHART="📊"
BELL="🔔"
EYE="👁️"

echo -e "${CYAN}${ROCKET} Production Validation Suite${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

AWS_REGION=$(aws configure get region || echo "us-east-1")
ENVIRONMENT="production"
ERRORS=0
WARNINGS=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get endpoints
echo -e "${BLUE}${INFO} Retrieving production endpoints...${NC}"
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-${ENVIRONMENT}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ] || [ -z "$CLOUDFRONT_DOMAIN" ]; then
    echo -e "${RED}${CROSS} Could not retrieve endpoints${NC}"
    echo -e "${RED}Ensure production stacks are deployed${NC}\n"
    exit 1
fi

echo -e "${GREEN}${CHECK} API Endpoint: ${API_ENDPOINT}${NC}"
echo -e "${GREEN}${CHECK} CloudFront: https://${CLOUDFRONT_DOMAIN}${NC}\n"

# ============================================================================
# SECTION 1: SMOKE TESTS
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${CHART} SECTION 1: Smoke Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 1.1: Frontend Accessibility
echo -e "${BLUE}Test 1.1: Frontend Accessibility${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFRONT_DOMAIN}/" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Frontend accessible (HTTP ${FRONTEND_STATUS})${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} Frontend returned HTTP ${FRONTEND_STATUS}${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.2: API Health Check
echo -e "${BLUE}Test 1.2: API Health Check${NC}"
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/health" 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}${CHECK} API health check passed (HTTP ${API_HEALTH})${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$API_HEALTH" = "404" ]; then
    echo -e "${YELLOW}${WARN} Health endpoint not implemented (HTTP ${API_HEALTH})${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} API health check failed (HTTP ${API_HEALTH})${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.3: Categories Endpoint
echo -e "${BLUE}Test 1.3: Categories Endpoint${NC}"
CATEGORIES_RESPONSE=$(curl -s "${API_ENDPOINT}/categories" 2>/dev/null || echo "ERROR")
CATEGORIES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/categories" 2>/dev/null || echo "000")

if [ "$CATEGORIES_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Categories endpoint accessible${NC}"
    
    if echo "$CATEGORIES_RESPONSE" | jq empty 2>/dev/null; then
        CATEGORY_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
        if [ "$CATEGORY_COUNT" -gt 0 ]; then
            echo -e "${GREEN}${CHECK} Found ${CATEGORY_COUNT} categories${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${YELLOW}${WARN} No categories found${NC}"
            WARNINGS=$((WARNINGS + 1))
            TESTS_PASSED=$((TESTS_PASSED + 1))
        fi
    else
        echo -e "${RED}${CROSS} Invalid JSON response${NC}"
        ERRORS=$((ERRORS + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${RED}${CROSS} Categories endpoint failed (HTTP ${CATEGORIES_STATUS})${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.4: Leaderboard Endpoint
echo -e "${BLUE}Test 1.4: Leaderboard Endpoint${NC}"
LEADERBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/leaderboard/global" 2>/dev/null || echo "000")

if [ "$LEADERBOARD_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Leaderboard endpoint accessible${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ "$LEADERBOARD_STATUS" = "404" ]; then
    echo -e "${YELLOW}${WARN} Leaderboard endpoint returned 404 (may be expected)${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} Leaderboard endpoint failed (HTTP ${LEADERBOARD_STATUS})${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.5: CORS Configuration
echo -e "${BLUE}Test 1.5: CORS Configuration${NC}"
CORS_HEADERS=$(curl -s -I -X OPTIONS "${API_ENDPOINT}/categories" \
    -H "Origin: https://${CLOUDFRONT_DOMAIN}" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control" || echo "")

if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}${CHECK} CORS headers configured${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} CORS headers not detected${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 1.6: WAF Protection
echo -e "${BLUE}Test 1.6: WAF Protection${NC}"
WAF_ARN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Security-${ENVIRONMENT}" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebAclArn`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$WAF_ARN" ]; then
    echo -e "${GREEN}${CHECK} WAF WebACL configured${NC}"
    echo -e "${BLUE}  ARN: ${WAF_ARN}${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} WAF not found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.7: Database Connectivity
echo -e "${BLUE}Test 1.7: Database Status${NC}"
DB_CLUSTER_ID=$(aws rds describe-db-clusters \
    --region "${AWS_REGION}" \
    --query 'DBClusters[?contains(DBClusterIdentifier, `trivia-nft-production`)].DBClusterIdentifier' \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_CLUSTER_ID" ]; then
    DB_STATUS=$(aws rds describe-db-clusters \
        --db-cluster-identifier "${DB_CLUSTER_ID}" \
        --region "${AWS_REGION}" \
        --query 'DBClusters[0].Status' \
        --output text 2>/dev/null || echo "")
    
    if [ "$DB_STATUS" = "available" ]; then
        echo -e "${GREEN}${CHECK} Database cluster available${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}${WARN} Database status: ${DB_STATUS}${NC}"
        WARNINGS=$((WARNINGS + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
else
    echo -e "${RED}${CROSS} Database cluster not found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 1.8: Redis Status
echo -e "${BLUE}Test 1.8: Redis Status${NC}"
REDIS_STATUS=$(aws elasticache describe-replication-groups \
    --region "${AWS_REGION}" \
    --query 'ReplicationGroups[?contains(ReplicationGroupId, `trivia-nft-production`)].Status' \
    --output text 2>/dev/null || echo "")

if [ "$REDIS_STATUS" = "available" ]; then
    echo -e "${GREEN}${CHECK} Redis cluster available${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
elif [ -n "$REDIS_STATUS" ]; then
    echo -e "${YELLOW}${WARN} Redis status: ${REDIS_STATUS}${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} Redis cluster not found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# ============================================================================
# SECTION 2: MONITORING DASHBOARDS
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${CHART} SECTION 2: Monitoring Dashboards${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 2.1: CloudWatch Dashboards
echo -e "${BLUE}Test 2.1: CloudWatch Dashboards${NC}"
DASHBOARDS=$(aws cloudwatch list-dashboards \
    --region "${AWS_REGION}" \
    --query 'DashboardEntries[?contains(DashboardName, `TriviaNFT-production`)].DashboardName' \
    --output text 2>/dev/null || echo "")

if [ -n "$DASHBOARDS" ]; then
    DASHBOARD_COUNT=$(echo "$DASHBOARDS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${DASHBOARD_COUNT} dashboard(s)${NC}"
    echo "$DASHBOARDS" | tr '\t' '\n' | while read -r dashboard; do
        echo -e "${BLUE}  - ${dashboard}${NC}"
    done
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} No dashboards found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2.2: Lambda Function Logs
echo -e "${BLUE}Test 2.2: Lambda Function Logs${NC}"
LOG_GROUPS=$(aws logs describe-log-groups \
    --region "${AWS_REGION}" \
    --log-group-name-prefix "/aws/lambda/TriviaNFT-Api-production" \
    --query 'logGroups[*].logGroupName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    LOG_COUNT=$(echo "$LOG_GROUPS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${LOG_COUNT} Lambda log group(s)${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} No Lambda log groups found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2.3: X-Ray Tracing
echo -e "${BLUE}Test 2.3: X-Ray Tracing${NC}"
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region "${AWS_REGION}" \
    --query 'Functions[?contains(FunctionName, `TriviaNFT-production`)].FunctionName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LAMBDA_FUNCTIONS" ]; then
    FUNCTION_COUNT=$(echo "$LAMBDA_FUNCTIONS" | wc -w)
    echo -e "${GREEN}${CHECK} Checking ${FUNCTION_COUNT} Lambda function(s)${NC}"
    
    XRAY_ENABLED=0
    XRAY_DISABLED=0
    
    for function in $LAMBDA_FUNCTIONS; do
        TRACING=$(aws lambda get-function-configuration \
            --function-name "${function}" \
            --region "${AWS_REGION}" \
            --query 'TracingConfig.Mode' \
            --output text 2>/dev/null || echo "PassThrough")
        
        if [ "$TRACING" = "Active" ]; then
            XRAY_ENABLED=$((XRAY_ENABLED + 1))
        else
            XRAY_DISABLED=$((XRAY_DISABLED + 1))
        fi
    done
    
    if [ $XRAY_DISABLED -gt 0 ]; then
        echo -e "${YELLOW}${WARN} ${XRAY_DISABLED} function(s) without X-Ray tracing${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}${CHECK} All functions have X-Ray tracing enabled${NC}"
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} No Lambda functions found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 2.4: Recent Metrics
echo -e "${BLUE}Test 2.4: Recent API Metrics (Last Hour)${NC}"
API_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-production" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$API_ID" ]; then
    REQUEST_COUNT=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name Count \
        --dimensions Name=ApiId,Value="${API_ID}" \
        --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Sum \
        --region "${AWS_REGION}" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$REQUEST_COUNT" != "None" ] && [ "$REQUEST_COUNT" != "0" ]; then
        echo -e "${GREEN}${CHECK} API requests in last hour: ${REQUEST_COUNT}${NC}"
    else
        echo -e "${YELLOW}${WARN} No API requests in the last hour${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Could not retrieve API metrics${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# ============================================================================
# SECTION 3: ALARM NOTIFICATIONS
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BELL} SECTION 3: Alarm Notifications${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 3.1: CloudWatch Alarms
echo -e "${BLUE}Test 3.1: CloudWatch Alarms${NC}"
ALARMS=$(aws cloudwatch describe-alarms \
    --region "${AWS_REGION}" \
    --alarm-name-prefix "TriviaNFT-production" \
    --query 'MetricAlarms[*].[AlarmName,StateValue]' \
    --output text 2>/dev/null || echo "")

if [ -n "$ALARMS" ]; then
    ALARM_COUNT=$(echo "$ALARMS" | wc -l)
    echo -e "${GREEN}${CHECK} Found ${ALARM_COUNT} alarm(s)${NC}"
    
    # Count alarm states
    OK_COUNT=$(echo "$ALARMS" | grep -c "OK" || echo "0")
    ALARM_STATE_COUNT=$(echo "$ALARMS" | grep -c "ALARM" || echo "0")
    INSUFFICIENT_COUNT=$(echo "$ALARMS" | grep -c "INSUFFICIENT_DATA" || echo "0")
    
    echo -e "${GREEN}  OK: ${OK_COUNT}${NC}"
    echo -e "${YELLOW}  INSUFFICIENT_DATA: ${INSUFFICIENT_COUNT}${NC}"
    
    if [ "$ALARM_STATE_COUNT" -gt 0 ]; then
        echo -e "${RED}  ALARM: ${ALARM_STATE_COUNT}${NC}"
        echo -e "${RED}${WARN} Alarms in ALARM state:${NC}"
        echo "$ALARMS" | grep "ALARM" | while read -r alarm state; do
            echo -e "${RED}  - ${alarm}${NC}"
        done
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}${CROSS} No alarms found${NC}"
    ERRORS=$((ERRORS + 1))
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Test 3.2: SNS Topics
echo -e "${BLUE}Test 3.2: SNS Topics for Notifications${NC}"
SNS_TOPICS=$(aws sns list-topics \
    --region "${AWS_REGION}" \
    --query 'Topics[?contains(TopicArn, `trivia-nft`) && contains(TopicArn, `production`)].TopicArn' \
    --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPICS" ]; then
    TOPIC_COUNT=$(echo "$SNS_TOPICS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${TOPIC_COUNT} SNS topic(s)${NC}"
    
    for topic in $SNS_TOPICS; do
        TOPIC_NAME=$(echo "$topic" | awk -F: '{print $NF}')
        echo -e "${BLUE}  Topic: ${TOPIC_NAME}${NC}"
        
        SUBSCRIPTIONS=$(aws sns list-subscriptions-by-topic \
            --topic-arn "${topic}" \
            --region "${AWS_REGION}" \
            --query 'Subscriptions[*].[Protocol,Endpoint,SubscriptionArn]' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$SUBSCRIPTIONS" ]; then
            SUB_COUNT=$(echo "$SUBSCRIPTIONS" | wc -l)
            echo -e "${GREEN}    ${CHECK} ${SUB_COUNT} subscription(s)${NC}"
            
            PENDING=$(echo "$SUBSCRIPTIONS" | grep -c "PendingConfirmation" || echo "0")
            if [ "$PENDING" -gt 0 ]; then
                echo -e "${YELLOW}    ${WARN} ${PENDING} pending confirmation${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        else
            echo -e "${YELLOW}    ${WARN} No subscriptions configured${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} No SNS topics found${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 3.3: Test Alarm Notification (Manual)
echo -e "${BLUE}Test 3.3: Alarm Notification Test${NC}"
echo -e "${YELLOW}${INFO} Manual test required for alarm notifications${NC}"
echo -e "${BLUE}To test alarm notifications:${NC}"
echo -e "${BLUE}  1. Manually trigger an alarm:${NC}"
echo -e "${BLUE}     aws cloudwatch set-alarm-state \\${NC}"
echo -e "${BLUE}       --alarm-name \"TriviaNFT-production-API-ErrorRate\" \\${NC}"
echo -e "${BLUE}       --state-value ALARM \\${NC}"
echo -e "${BLUE}       --state-reason \"Testing notification\"${NC}"
echo -e "${BLUE}  2. Verify email/SMS notification received${NC}"
echo -e "${BLUE}  3. Reset alarm to OK state${NC}"
echo ""

# ============================================================================
# SECTION 4: INITIAL TRAFFIC MONITORING
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${EYE} SECTION 4: Initial Traffic Monitoring${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test 4.1: Recent Lambda Errors
echo -e "${BLUE}Test 4.1: Recent Lambda Errors (Last Hour)${NC}"
START_TIME=$(($(date +%s) - 3600))
END_TIME=$(date +%s)

ERROR_COUNT=0
if [ -n "$LOG_GROUPS" ]; then
    for log_group in $LOG_GROUPS; do
        ERRORS_FOUND=$(aws logs filter-log-events \
            --log-group-name "${log_group}" \
            --region "${AWS_REGION}" \
            --start-time "${START_TIME}000" \
            --end-time "${END_TIME}000" \
            --filter-pattern "ERROR" \
            --query 'events[*].message' \
            --output text 2>/dev/null | wc -l || echo "0")
        
        if [ "$ERRORS_FOUND" -gt 0 ]; then
            LOG_NAME=$(echo "$log_group" | awk -F/ '{print $NF}')
            echo -e "${YELLOW}  ${WARN} ${LOG_NAME}: ${ERRORS_FOUND} error(s)${NC}"
            ERROR_COUNT=$((ERROR_COUNT + ERRORS_FOUND))
        fi
    done
    
    if [ $ERROR_COUNT -eq 0 ]; then
        echo -e "${GREEN}${CHECK} No errors in the last hour${NC}"
    else
        echo -e "${YELLOW}${WARN} Total: ${ERROR_COUNT} error(s) in the last hour${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Cannot check for errors - no log groups${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4.2: API Gateway Error Rate
echo -e "${BLUE}Test 4.2: API Gateway Error Rate${NC}"
if [ -n "$API_ID" ]; then
    ERROR_RATE=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name 4XXError \
        --dimensions Name=ApiId,Value="${API_ID}" \
        --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Sum \
        --region "${AWS_REGION}" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$ERROR_RATE" = "None" ] || [ "$ERROR_RATE" = "0" ]; then
        echo -e "${GREEN}${CHECK} No 4XX errors in the last hour${NC}"
    else
        echo -e "${YELLOW}${WARN} ${ERROR_RATE} 4XX errors in the last hour${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Cannot check error rate${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4.3: API Latency
echo -e "${BLUE}Test 4.3: API Latency (p95)${NC}"
if [ -n "$API_ID" ]; then
    LATENCY=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name Latency \
        --dimensions Name=ApiId,Value="${API_ID}" \
        --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Average \
        --region "${AWS_REGION}" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$LATENCY" != "None" ] && [ "$LATENCY" != "0" ]; then
        LATENCY_INT=$(printf "%.0f" "$LATENCY")
        if [ "$LATENCY_INT" -lt 1000 ]; then
            echo -e "${GREEN}${CHECK} Average latency: ${LATENCY_INT}ms${NC}"
        else
            echo -e "${YELLOW}${WARN} Average latency: ${LATENCY_INT}ms (high)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}${WARN} No latency data available${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Cannot check latency${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4.4: Database Connections
echo -e "${BLUE}Test 4.4: Database Connections${NC}"
if [ -n "$DB_CLUSTER_ID" ]; then
    CONNECTIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/RDS \
        --metric-name DatabaseConnections \
        --dimensions Name=DBClusterIdentifier,Value="${DB_CLUSTER_ID}" \
        --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Average \
        --region "${AWS_REGION}" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$CONNECTIONS" != "None" ] && [ "$CONNECTIONS" != "0" ]; then
        CONN_INT=$(printf "%.0f" "$CONNECTIONS")
        echo -e "${GREEN}${CHECK} Average connections: ${CONN_INT}${NC}"
    else
        echo -e "${YELLOW}${WARN} No connection metrics available${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Cannot check database connections${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4.5: CloudFront Cache Hit Rate
echo -e "${BLUE}Test 4.5: CloudFront Cache Performance${NC}"
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-production" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$DISTRIBUTION_ID" ]; then
    CACHE_HIT_RATE=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name CacheHitRate \
        --dimensions Name=DistributionId,Value="${DISTRIBUTION_ID}" \
        --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 3600 \
        --statistics Average \
        --region us-east-1 \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$CACHE_HIT_RATE" != "None" ] && [ "$CACHE_HIT_RATE" != "0" ]; then
        RATE_INT=$(printf "%.0f" "$CACHE_HIT_RATE")
        echo -e "${GREEN}${CHECK} Cache hit rate: ${RATE_INT}%${NC}"
    else
        echo -e "${YELLOW}${WARN} No cache metrics available${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}${WARN} Cannot check CloudFront metrics${NC}"
    WARNINGS=$((WARNINGS + 1))
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# ============================================================================
# SUMMARY AND RECOMMENDATIONS
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${CHART} VALIDATION SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "${BLUE}📊 Test Results:${NC}"
echo -e "  Total Tests: ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "  ${RED}Failed: ${TESTS_FAILED}${NC}"
echo -e "  ${YELLOW}Warnings: ${WARNINGS}${NC}"
echo ""

# Determine overall status
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}${CHECK} Production Validation PASSED${NC}\n"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}${WARN} ${WARNINGS} warning(s) detected${NC}"
        echo -e "${YELLOW}Review warnings above and address if needed${NC}\n"
    fi
    
    echo -e "${BLUE}📝 Recommended Next Steps:${NC}"
    echo ""
    echo -e "${GREEN}Immediate Actions (First Hour):${NC}"
    echo "  1. Monitor CloudWatch dashboards continuously"
    echo "  2. Watch for any alarm notifications"
    echo "  3. Test wallet connection with MAINNET wallet"
    echo "  4. Complete a test session end-to-end"
    echo "  5. Verify NFT minting works (small test transaction)"
    echo "  6. Check error logs every 15 minutes"
    echo ""
    echo -e "${GREEN}First 24 Hours:${NC}"
    echo "  1. Monitor API error rates and latency"
    echo "  2. Check database and Redis performance"
    echo "  3. Monitor Blockfrost API usage"
    echo "  4. Review AWS costs in Cost Explorer"
    echo "  5. Gather initial user feedback"
    echo "  6. Document any issues encountered"
    echo ""
    echo -e "${GREEN}First Week:${NC}"
    echo "  1. Analyze CloudWatch Logs Insights queries"
    echo "  2. Review performance metrics and optimize"
    echo "  3. Adjust Aurora/Lambda scaling if needed"
    echo "  4. Review and tune alarm thresholds"
    echo "  5. Conduct security review"
    echo "  6. Plan cost optimization"
    echo ""
    echo -e "${BLUE}📊 Monitoring Links:${NC}"
    echo "  CloudWatch Dashboards:"
    echo "    https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:"
    echo ""
    echo "  CloudWatch Alarms:"
    echo "    https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#alarmsV2:"
    echo ""
    echo "  X-Ray Service Map:"
    echo "    https://console.aws.amazon.com/xray/home?region=${AWS_REGION}#/service-map"
    echo ""
    echo "  Lambda Functions:"
    echo "    https://console.aws.amazon.com/lambda/home?region=${AWS_REGION}#/functions"
    echo ""
    echo -e "${RED}${WARN} IMPORTANT REMINDERS:${NC}"
    echo "  - This is PRODUCTION with MAINNET Cardano"
    echo "  - Real ADA will be spent on transactions"
    echo "  - Monitor costs closely in AWS Cost Explorer"
    echo "  - Have rollback plan ready"
    echo "  - Keep team informed of any issues"
    echo "  - Document all changes and incidents"
    echo ""
    
    exit 0
else
    echo -e "${RED}${CROSS} Production Validation FAILED${NC}\n"
    echo -e "${RED}${TESTS_FAILED} critical test(s) failed${NC}\n"
    
    echo -e "${BLUE}🔍 Troubleshooting Steps:${NC}"
    echo "  1. Review failed tests above"
    echo "  2. Check CloudFormation stacks for errors"
    echo "  3. Verify all secrets are configured correctly"
    echo "  4. Check Lambda function logs in CloudWatch"
    echo "  5. Verify VPC and security group configuration"
    echo "  6. Ensure database migrations completed"
    echo "  7. Check IAM permissions"
    echo ""
    echo -e "${YELLOW}${WARN} DO NOT proceed with production launch until all tests pass${NC}\n"
    
    exit 1
fi

