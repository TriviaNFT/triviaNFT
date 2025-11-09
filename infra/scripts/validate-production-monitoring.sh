#!/bin/bash

# Validate Production Monitoring Setup
# This script verifies that all monitoring and alerting is properly configured

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

echo -e "${BLUE}${INFO} Validating Production Monitoring Setup${NC}\n"

AWS_REGION=$(aws configure get region || echo "us-east-1")
ERRORS=0
WARNINGS=0

# Test 1: CloudWatch Dashboards
echo -e "${BLUE}Test 1: CloudWatch Dashboards${NC}"
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
    echo ""
else
    echo -e "${RED}${CROSS} No dashboards found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: CloudWatch Alarms
echo -e "${BLUE}Test 2: CloudWatch Alarms${NC}"
ALARMS=$(aws cloudwatch describe-alarms \
    --region "${AWS_REGION}" \
    --alarm-name-prefix "TriviaNFT-production" \
    --query 'MetricAlarms[*].[AlarmName,StateValue]' \
    --output text 2>/dev/null || echo "")

if [ -n "$ALARMS" ]; then
    ALARM_COUNT=$(echo "$ALARMS" | wc -l)
    echo -e "${GREEN}${CHECK} Found ${ALARM_COUNT} alarm(s)${NC}"
    
    # Check alarm states
    ALARM_STATES=$(echo "$ALARMS" | awk '{print $2}' | sort | uniq -c)
    echo -e "${BLUE}Alarm States:${NC}"
    echo "$ALARM_STATES" | while read -r count state; do
        if [ "$state" = "OK" ]; then
            echo -e "${GREEN}  ${count} ${state}${NC}"
        elif [ "$state" = "INSUFFICIENT_DATA" ]; then
            echo -e "${YELLOW}  ${count} ${state}${NC}"
        else
            echo -e "${RED}  ${count} ${state}${NC}"
        fi
    done
    echo ""
    
    # Check for alarms in ALARM state
    ALARM_COUNT_ALARM=$(echo "$ALARMS" | grep "ALARM" | wc -l || echo "0")
    if [ "$ALARM_COUNT_ALARM" -gt 0 ]; then
        echo -e "${RED}${WARN} ${ALARM_COUNT_ALARM} alarm(s) in ALARM state:${NC}"
        echo "$ALARMS" | grep "ALARM" | while read -r alarm state; do
            echo -e "${RED}  - ${alarm}${NC}"
        done
        echo ""
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}${CROSS} No alarms found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: SNS Topics for Alarms
echo -e "${BLUE}Test 3: SNS Topics for Alarm Notifications${NC}"
SNS_TOPICS=$(aws sns list-topics \
    --region "${AWS_REGION}" \
    --query 'Topics[?contains(TopicArn, `trivia-nft`) && contains(TopicArn, `production`)].TopicArn' \
    --output text 2>/dev/null || echo "")

if [ -n "$SNS_TOPICS" ]; then
    TOPIC_COUNT=$(echo "$SNS_TOPICS" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${TOPIC_COUNT} SNS topic(s)${NC}"
    
    # Check subscriptions for each topic
    echo "$SNS_TOPICS" | tr '\t' '\n' | while read -r topic; do
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
            echo "$SUBSCRIPTIONS" | while read -r protocol endpoint arn; do
                if [[ "$arn" == *"PendingConfirmation"* ]]; then
                    echo -e "${YELLOW}      - ${protocol}: ${endpoint} (Pending Confirmation)${NC}"
                else
                    echo -e "${GREEN}      - ${protocol}: ${endpoint}${NC}"
                fi
            done
        else
            echo -e "${YELLOW}    ${WARN} No subscriptions configured${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
    echo ""
else
    echo -e "${YELLOW}${WARN} No SNS topics found${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 4: Lambda Function Logs
echo -e "${BLUE}Test 4: Lambda Function Logs${NC}"
LOG_GROUPS=$(aws logs describe-log-groups \
    --region "${AWS_REGION}" \
    --log-group-name-prefix "/aws/lambda/TriviaNFT-Api-production" \
    --query 'logGroups[*].[logGroupName,retentionInDays]' \
    --output text 2>/dev/null || echo "")

if [ -n "$LOG_GROUPS" ]; then
    LOG_COUNT=$(echo "$LOG_GROUPS" | wc -l)
    echo -e "${GREEN}${CHECK} Found ${LOG_COUNT} Lambda log group(s)${NC}"
    
    # Check retention settings
    echo "$LOG_GROUPS" | while read -r log_group retention; do
        LOG_NAME=$(echo "$log_group" | awk -F/ '{print $NF}')
        if [ -n "$retention" ] && [ "$retention" != "None" ]; then
            echo -e "${GREEN}  - ${LOG_NAME}: ${retention} days retention${NC}"
        else
            echo -e "${YELLOW}  - ${LOG_NAME}: No retention set (logs kept indefinitely)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
    echo ""
else
    echo -e "${RED}${CROSS} No Lambda log groups found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 5: X-Ray Tracing
echo -e "${BLUE}Test 5: X-Ray Tracing${NC}"
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region "${AWS_REGION}" \
    --query 'Functions[?contains(FunctionName, `TriviaNFT-production`)].FunctionName' \
    --output text 2>/dev/null || echo "")

if [ -n "$LAMBDA_FUNCTIONS" ]; then
    FUNCTION_COUNT=$(echo "$LAMBDA_FUNCTIONS" | wc -w)
    echo -e "${GREEN}${CHECK} Checking ${FUNCTION_COUNT} Lambda function(s)${NC}"
    
    XRAY_ENABLED=0
    XRAY_DISABLED=0
    
    echo "$LAMBDA_FUNCTIONS" | tr '\t' '\n' | while read -r function; do
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
        echo -e "${YELLOW}${WARN} ${XRAY_DISABLED} function(s) without X-Ray tracing${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}${CHECK} All functions have X-Ray tracing enabled${NC}\n"
    fi
else
    echo -e "${RED}${CROSS} No Lambda functions found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Test 6: CloudWatch Logs Insights Queries
echo -e "${BLUE}Test 6: CloudWatch Logs Insights Queries${NC}"
SAVED_QUERIES=$(aws logs describe-query-definitions \
    --region "${AWS_REGION}" \
    --query 'queryDefinitions[?contains(name, `TriviaNFT`) || contains(name, `production`)].name' \
    --output text 2>/dev/null || echo "")

if [ -n "$SAVED_QUERIES" ]; then
    QUERY_COUNT=$(echo "$SAVED_QUERIES" | wc -w)
    echo -e "${GREEN}${CHECK} Found ${QUERY_COUNT} saved query(ies)${NC}"
    echo "$SAVED_QUERIES" | tr '\t' '\n' | while read -r query; do
        echo -e "${BLUE}  - ${query}${NC}"
    done
    echo ""
else
    echo -e "${YELLOW}${WARN} No saved queries found${NC}"
    echo -e "${YELLOW}Consider creating queries for common troubleshooting scenarios${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 7: Recent Lambda Errors
echo -e "${BLUE}Test 7: Recent Lambda Errors (Last Hour)${NC}"
START_TIME=$(($(date +%s) - 3600))
END_TIME=$(date +%s)

ERROR_COUNT=0
if [ -n "$LOG_GROUPS" ]; then
    echo "$LOG_GROUPS" | while read -r log_group retention; do
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
        echo -e "${GREEN}${CHECK} No errors found in the last hour${NC}\n"
    else
        echo -e "${YELLOW}${WARN} Total: ${ERROR_COUNT} error(s) in the last hour${NC}"
        echo -e "${YELLOW}Review CloudWatch Logs for details${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}${WARN} Cannot check for errors - no log groups found${NC}\n"
fi

# Test 8: API Gateway Metrics
echo -e "${BLUE}Test 8: API Gateway Metrics (Last Hour)${NC}"
API_ID=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Api-production" \
    --region "${AWS_REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$API_ID" ]; then
    echo -e "${GREEN}${CHECK} API Gateway ID: ${API_ID}${NC}"
    
    # Get request count
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
        echo -e "${GREEN}${CHECK} Requests in last hour: ${REQUEST_COUNT}${NC}\n"
    else
        echo -e "${YELLOW}${WARN} No requests in the last hour${NC}"
        echo -e "${YELLOW}This may be expected for a new deployment${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}${WARN} Could not get API Gateway ID${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 9: Database Metrics
echo -e "${BLUE}Test 9: Aurora Database Metrics${NC}"
DB_CLUSTER_ID=$(aws rds describe-db-clusters \
    --region "${AWS_REGION}" \
    --query 'DBClusters[?contains(DBClusterIdentifier, `trivia-nft-production`)].DBClusterIdentifier' \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_CLUSTER_ID" ]; then
    echo -e "${GREEN}${CHECK} Database Cluster: ${DB_CLUSTER_ID}${NC}"
    
    # Get connection count
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
    
    if [ "$CONNECTIONS" != "None" ]; then
        echo -e "${GREEN}${CHECK} Average connections: ${CONNECTIONS}${NC}\n"
    else
        echo -e "${YELLOW}${WARN} No connection metrics available yet${NC}\n"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}${WARN} Could not find database cluster${NC}\n"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 10: Test Alarm Notification (Optional)
echo -e "${BLUE}Test 10: Alarm Notification Test${NC}"
echo -e "${YELLOW}${INFO} To test alarm notifications, you can manually trigger an alarm:${NC}"
echo -e "${BLUE}  aws cloudwatch set-alarm-state \\${NC}"
echo -e "${BLUE}    --alarm-name \"TriviaNFT-production-API-ErrorRate\" \\${NC}"
echo -e "${BLUE}    --state-value ALARM \\${NC}"
echo -e "${BLUE}    --state-reason \"Testing alarm notification\"${NC}"
echo ""
echo -e "${YELLOW}${WARN} This test is not automated to avoid false alarms${NC}\n"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}📊 Validation Results:${NC}"
echo -e "  Tests Run: 10"
echo -e "  Errors: ${ERRORS}"
echo -e "  Warnings: ${WARNINGS}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} Monitoring validation passed!${NC}\n"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}${WARN} ${WARNINGS} warning(s) detected${NC}"
        echo -e "${YELLOW}Review warnings above and address if needed${NC}\n"
    fi
    
    echo -e "${BLUE}📝 Recommended Actions:${NC}"
    echo "  1. Configure SNS topic subscriptions for alarm notifications"
    echo "  2. Test alarm notifications manually"
    echo "  3. Create CloudWatch Logs Insights queries for troubleshooting"
    echo "  4. Set up CloudWatch dashboard bookmarks"
    echo "  5. Document monitoring procedures for the team"
    echo "  6. Schedule regular monitoring reviews"
    echo ""
    
    exit 0
else
    echo -e "${RED}${CROSS} Monitoring validation failed with ${ERRORS} error(s)${NC}\n"
    echo -e "${YELLOW}Please review the errors above and fix any issues${NC}\n"
    
    echo -e "${BLUE}🔍 Troubleshooting:${NC}"
    echo "  1. Verify ObservabilityStack is deployed"
    echo "  2. Check CloudFormation stack outputs"
    echo "  3. Verify Lambda functions are deployed"
    echo "  4. Check IAM permissions for CloudWatch"
    echo ""
    
    exit 1
fi
