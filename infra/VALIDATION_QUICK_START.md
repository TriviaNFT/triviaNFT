# Production Validation Quick Start

## 🚀 Quick Validation (5 Minutes)

### 1. Run Automated Script
```bash
cd infra && ./scripts/production-validation.sh
```
**Expected:** All tests pass ✅

### 2. Check Dashboards
```bash
# Open in browser
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:
```
**Expected:** 4 dashboards with metrics ✅

### 3. Check Alarms
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix "TriviaNFT-production" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```
**Expected:** All OK or INSUFFICIENT_DATA ✅

### 4. Test Frontend
```bash
# Get URL
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Web-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
  --output text

# Open in browser and verify page loads
```
**Expected:** Page loads without errors ✅

### 5. Test API
```bash
# Get endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Api-production \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test categories endpoint
curl ${API_ENDPOINT}/categories
```
**Expected:** JSON array of categories ✅

## ✅ Validation Complete

If all 5 checks pass, production is ready!

## 📊 Monitoring Links

**CloudWatch Dashboards:**
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:

**CloudWatch Alarms:**
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:

**X-Ray Service Map:**
https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map

**Lambda Functions:**
https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions

## 🔍 Quick Troubleshooting

### Script Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check stack status
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-Api-production \
  --query 'Stacks[0].StackStatus'
```

### Frontend Not Loading
```bash
# Check CloudFront status
aws cloudfront list-distributions \
  --query 'DistributionList.Items[?contains(Comment, `TriviaNFT-production`)].Status'
```

### API Errors
```bash
# Check recent Lambda errors
aws logs tail /aws/lambda/TriviaNFT-Api-production-SessionStart \
  --follow --filter-pattern "ERROR"
```

## 📝 Full Documentation

For detailed validation procedures, see:
- [Production Validation Execution Guide](./PRODUCTION_VALIDATION_EXECUTION.md)
- [Production Validation Guide](./PRODUCTION_VALIDATION_GUIDE.md)
- [Production Validation Checklist](./PRODUCTION_VALIDATION_CHECKLIST.md)

## 🆘 Emergency Contacts

**On-Call:** [Configure]  
**AWS Support:** https://console.aws.amazon.com/support/  
**Team Slack:** [Configure]

---

**⚠️ Remember:** This is PRODUCTION on MAINNET. Monitor closely!
