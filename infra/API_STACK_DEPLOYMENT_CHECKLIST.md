# API Stack Deployment Checklist

Use this checklist to ensure successful deployment of the API Stack.

## Pre-Deployment

### 1. Dependencies Deployed
- [ ] SecurityStack deployed (provides secrets)
- [ ] DataStack deployed (provides VPC, Aurora, Redis)
- [ ] AppConfigStack deployed (provides game configuration)
- [ ] WorkflowStack deployed (optional - provides Step Functions)

### 2. Build Artifacts

#### API Service
```bash
cd services/api
pnpm install
pnpm build
```
- [ ] TypeScript compiled successfully
- [ ] `dist/` directory created
- [ ] No compilation errors

#### Shared Package
```bash
cd packages/shared
pnpm install
pnpm build
```
- [ ] TypeScript compiled successfully
- [ ] `dist/` directory created
- [ ] No compilation errors

#### Lambda Layer
```bash
cd services/api
chmod +x scripts/build-layer.sh
./scripts/build-layer.sh
```
- [ ] Script executed successfully
- [ ] `layer/` directory created
- [ ] `layer/nodejs/node_modules/` populated
- [ ] Layer size < 50MB (check output)

### 3. CDK Preparation

```bash
cd infra
pnpm install
pnpm build
```
- [ ] TypeScript compiled successfully
- [ ] No compilation errors
- [ ] CDK context configured

## Deployment

### 1. Synthesize Stack

```bash
cd infra
pnpm cdk synth ApiStack --context environment=staging
```
- [ ] CloudFormation template generated
- [ ] No synthesis errors
- [ ] Review template in `cdk.out/`

### 2. Review Changes

```bash
pnpm cdk diff ApiStack --context environment=staging
```
- [ ] Review all resources to be created
- [ ] Verify Lambda function configurations
- [ ] Check IAM permissions
- [ ] Confirm environment variables

### 3. Deploy Stack

```bash
pnpm cdk deploy ApiStack --context environment=staging
```
- [ ] Deployment started
- [ ] Lambda layers uploaded
- [ ] Lambda functions created
- [ ] API Gateway created
- [ ] Routes configured
- [ ] Authorizer attached
- [ ] Deployment completed successfully

### 4. Verify Outputs

Check CloudFormation outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs'
```

Expected outputs:
- [ ] `ApiEndpoint` - API Gateway URL
- [ ] `ApiId` - API Gateway ID
- [ ] `DependenciesLayerArn` - Dependencies layer ARN
- [ ] `SharedUtilsLayerArn` - Shared utilities layer ARN

## Post-Deployment Verification

### 1. Lambda Functions

Check all functions are deployed:
```bash
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `trivia-nft`)].FunctionName'
```

Expected functions (staging):
- [ ] trivia-nft-authorizer-staging
- [ ] trivia-nft-connect-staging
- [ ] trivia-nft-profile-staging
- [ ] trivia-nft-me-staging
- [ ] trivia-nft-start-session-staging
- [ ] trivia-nft-submit-answer-staging
- [ ] trivia-nft-complete-session-staging
- [ ] trivia-nft-session-history-staging
- [ ] trivia-nft-flag-question-staging
- [ ] trivia-nft-get-eligibilities-staging
- [ ] trivia-nft-initiate-mint-staging
- [ ] trivia-nft-get-mint-status-staging
- [ ] trivia-nft-get-forge-progress-staging
- [ ] trivia-nft-initiate-forge-staging
- [ ] trivia-nft-get-forge-status-staging
- [ ] trivia-nft-get-global-leaderboard-staging
- [ ] trivia-nft-get-category-leaderboard-staging
- [ ] trivia-nft-get-season-leaderboard-staging
- [ ] trivia-nft-get-current-season-staging

### 2. Lambda Layers

Check layers are attached:
```bash
aws lambda get-function --function-name trivia-nft-connect-staging \
  --query 'Configuration.Layers[*].Arn'
```
- [ ] Dependencies layer attached
- [ ] Shared utilities layer attached

### 3. API Gateway

Check API is configured:
```bash
aws apigatewayv2 get-apis \
  --query 'Items[?Name==`trivia-nft-api-staging`]'
```
- [ ] API exists
- [ ] CORS configured
- [ ] Stage deployed

Check routes:
```bash
aws apigatewayv2 get-routes --api-id <API_ID> \
  --query 'Items[*].RouteKey'
```
- [ ] All expected routes present
- [ ] Authorizer attached to protected routes

### 4. CloudWatch Logs

Check log groups created:
```bash
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/trivia-nft
```
- [ ] Log groups exist for all functions
- [ ] Retention set to 30 days

### 5. X-Ray Tracing

Check tracing enabled:
```bash
aws lambda get-function-configuration \
  --function-name trivia-nft-connect-staging \
  --query 'TracingConfig.Mode'
```
- [ ] Returns "Active"

## Functional Testing

### 1. Public Endpoints

Test wallet connection:
```bash
API_URL="<your-api-endpoint>"

curl -X POST $API_URL/auth/connect \
  -H "Content-Type: application/json" \
  -d '{
    "stakeKey": "stake1test...",
    "address": "addr1test..."
  }'
```
- [ ] Returns 200 OK
- [ ] Returns JWT token
- [ ] No errors in CloudWatch Logs

Test leaderboard:
```bash
curl $API_URL/leaderboard/global
```
- [ ] Returns 200 OK
- [ ] Returns leaderboard data
- [ ] No errors in CloudWatch Logs

### 2. Authenticated Endpoints

Get JWT token from connect response, then:

```bash
JWT_TOKEN="<token-from-connect>"

curl $API_URL/auth/me \
  -H "Authorization: Bearer $JWT_TOKEN"
```
- [ ] Returns 200 OK
- [ ] Returns user profile
- [ ] Authorizer logs show successful validation

Test session start:
```bash
curl -X POST $API_URL/sessions/start \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "science"
  }'
```
- [ ] Returns 200 OK
- [ ] Returns session with questions
- [ ] Session created in Redis

### 3. Authorization

Test without token:
```bash
curl $API_URL/auth/me
```
- [ ] Returns 401 Unauthorized
- [ ] Authorizer denies access

Test with invalid token:
```bash
curl $API_URL/auth/me \
  -H "Authorization: Bearer invalid-token"
```
- [ ] Returns 401 Unauthorized
- [ ] Authorizer logs show validation failure

## Monitoring Setup

### 1. CloudWatch Dashboards

- [ ] Create dashboard for API metrics
- [ ] Add widgets for Lambda invocations
- [ ] Add widgets for API Gateway latency
- [ ] Add widgets for error rates

### 2. CloudWatch Alarms

- [ ] API error rate > 5% alarm
- [ ] Lambda function errors alarm
- [ ] API Gateway 5xx errors alarm
- [ ] Lambda throttles alarm

### 3. X-Ray Service Map

- [ ] Open X-Ray console
- [ ] View service map
- [ ] Verify all services connected
- [ ] Check for errors or high latency

## Rollback Plan

If deployment fails or issues are found:

### 1. Rollback Stack

```bash
pnpm cdk deploy ApiStack --rollback
```

### 2. Delete Stack (if needed)

```bash
pnpm cdk destroy ApiStack --context environment=staging
```

### 3. Restore Previous Version

If Lambda functions need rollback:
```bash
aws lambda update-alias \
  --function-name trivia-nft-connect-staging \
  --name LIVE \
  --function-version <previous-version>
```

## Troubleshooting

### Lambda Function Errors

1. Check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/trivia-nft-connect-staging --follow
```

2. Check function configuration:
```bash
aws lambda get-function-configuration \
  --function-name trivia-nft-connect-staging
```

3. Verify environment variables set correctly
4. Verify VPC configuration
5. Verify security group rules

### API Gateway Errors

1. Check API Gateway logs:
```bash
aws logs tail /aws/apigateway/trivia-nft-staging --follow
```

2. Test integration directly:
```bash
aws lambda invoke \
  --function-name trivia-nft-connect-staging \
  --payload '{"body":"{}"}' \
  response.json
```

### Authorization Issues

1. Check authorizer logs:
```bash
aws logs tail /aws/lambda/trivia-nft-authorizer-staging --follow
```

2. Verify JWT secret in Secrets Manager
3. Test JWT token validation locally
4. Check authorizer cache TTL

### VPC Connectivity

1. Verify Lambda in private subnets
2. Check security group rules:
```bash
aws ec2 describe-security-groups \
  --group-ids <lambda-sg-id>
```

3. Verify NAT Gateway configured
4. Test database connectivity from Lambda

## Success Criteria

✅ All Lambda functions deployed and healthy
✅ API Gateway configured with all routes
✅ JWT authorizer working correctly
✅ Public endpoints accessible
✅ Authenticated endpoints require valid JWT
✅ CloudWatch logs receiving data
✅ X-Ray tracing active
✅ No errors in CloudWatch Logs
✅ Functional tests passing
✅ Monitoring dashboards created

## Sign-Off

- [ ] Deployment completed successfully
- [ ] All verification steps passed
- [ ] Functional tests passed
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

**Deployed by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Stack Version:** _______________
