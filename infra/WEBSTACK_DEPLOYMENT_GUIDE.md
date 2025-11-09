# WebStack Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the TriviaNFT WebStack, which includes S3 static hosting, CloudFront CDN, and optional Route 53 DNS configuration.

## Prerequisites

### Required
- AWS CLI installed and configured
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Node.js 20+ and pnpm installed
- AWS account with appropriate permissions
- SecurityStack deployed (provides WAF WebACL)

### Optional (for custom domain)
- Domain name registered
- Route 53 hosted zone created
- ACM certificate in us-east-1 region

## Architecture

```
Users → Route 53 (optional) → CloudFront + WAF → Origin Shield → S3 Bucket
                                      ↓
                                 Log Bucket
```

## Deployment Steps

### Step 1: Deploy SecurityStack (if not already deployed)

The WebStack depends on the SecurityStack for the WAF WebACL.

```bash
cd infra
pnpm install
cdk deploy TriviaNFT-Security-staging
```

### Step 2: Deploy WebStack (Staging)

Deploy without custom domain for initial testing:

```bash
cdk deploy TriviaNFT-Web-staging
```

**Expected outputs**:
```
TriviaNFT-Web-staging.WebsiteBucketName = trivia-nft-web-staging-123456789012
TriviaNFT-Web-staging.DistributionDomainName = d123456.cloudfront.net
TriviaNFT-Web-staging.DistributionId = E1234567890ABC
```

### Step 3: Verify Deployment

Run the verification script:

```bash
chmod +x scripts/verify-webstack.sh
./scripts/verify-webstack.sh staging
```

This will check:
- S3 bucket configuration
- CloudFront distribution settings
- WAF attachment
- Compression and caching
- Security headers

### Step 4: Upload Frontend Application

Build and upload your frontend:

```bash
# Build frontend (from apps/web directory)
cd ../apps/web
pnpm build

# Upload to S3
aws s3 sync dist/ s3://trivia-nft-web-staging-123456789012/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Step 5: Test the Application

Access your application:
```
https://d123456.cloudfront.net
```

Test checklist:
- [ ] Application loads successfully
- [ ] HTTPS is enforced (HTTP redirects)
- [ ] Static assets are cached (check X-Cache header)
- [ ] Compression is working (check Content-Encoding header)
- [ ] Security headers are present
- [ ] SPA routing works (refresh on any route)

## Production Deployment with Custom Domain

### Step 1: Create ACM Certificate

The certificate **must** be in us-east-1 region for CloudFront:

```bash
aws acm request-certificate \
  --domain-name app.trivianft.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: Validate Certificate

1. Get the DNS validation records:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/... \
  --region us-east-1
```

2. Add the CNAME records to your Route 53 hosted zone

3. Wait for validation (usually 5-30 minutes)

### Step 3: Get Hosted Zone ID

```bash
aws route53 list-hosted-zones-by-name \
  --dns-name trivianft.com \
  --query "HostedZones[0].Id" \
  --output text
```

### Step 4: Deploy with Custom Domain

```bash
cdk deploy TriviaNFT-Web-production \
  -c environment=production \
  -c domainName=app.trivianft.com \
  -c hostedZoneId=Z1234567890ABC \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/...
```

### Step 5: Wait for DNS Propagation

DNS propagation can take up to 48 hours, but usually completes within 1-2 hours.

Check DNS propagation:
```bash
dig app.trivianft.com
nslookup app.trivianft.com
```

### Step 6: Upload Production Frontend

```bash
# Build production frontend
cd apps/web
pnpm build

# Upload to S3
aws s3 sync dist/ s3://trivia-nft-web-production-123456789012/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Configuration Options

### Environment Variables

Set these in your CDK context or environment:

```json
{
  "environment": "staging|production",
  "domainName": "app.trivianft.com",
  "hostedZoneId": "Z1234567890ABC",
  "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/..."
}
```

### Stack Properties

```typescript
interface WebStackProps {
  environment: 'staging' | 'production';
  webAcl: wafv2.CfnWebACL;           // Required
  domainName?: string;                // Optional
  hostedZoneId?: string;              // Optional
  certificateArn?: string;            // Optional
}
```

## Caching Strategy

### Static Assets (24-hour cache)
- `/static/*` - JavaScript, CSS bundles
- `/assets/*` - Images, fonts, media
- `/*.png` - Icons
- `/*.ico` - Favicons

**Cache Policy**:
- Default TTL: 24 hours
- Max TTL: 7 days
- Min TTL: 0 seconds
- Compression: Gzip + Brotli

### HTML Files (5-minute cache)
- `/` - Root index.html
- `/*.html` - All HTML files

**Cache Policy**:
- Default TTL: 5 minutes
- Max TTL: 1 hour
- Min TTL: 0 seconds
- Compression: Gzip + Brotli

**Rationale**: Short TTL for HTML allows quick updates while still benefiting from caching.

## Cache Invalidation

### When to Invalidate

Invalidate the cache after:
- Deploying new frontend code
- Updating environment variables
- Fixing critical bugs
- Changing routing configuration

### How to Invalidate

**All files**:
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**Specific files**:
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html" "/static/main.js"
```

**Check invalidation status**:
```bash
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABC \
  --id I1234567890ABC
```

### Cost Considerations

- First 1,000 invalidation paths per month: Free
- Additional paths: $0.005 per path
- Use wildcard (`/*`) to invalidate all files with one path

## Monitoring

### CloudWatch Metrics

Key metrics to monitor:

1. **Requests**: Total number of requests
2. **BytesDownloaded**: Total bytes served
3. **4xxErrorRate**: Client errors (should be < 5%)
4. **5xxErrorRate**: Server errors (should be < 1%)
5. **CacheHitRate**: Cache efficiency (target > 80%)

### Access Logs

Logs are stored in:
```
s3://trivia-nft-logs-{environment}-{account}/cloudfront/
```

**Log format**: Standard CloudFront access logs

**Retention**:
- 0-30 days: Standard storage
- 30-90 days: Infrequent Access storage
- 90+ days: Automatically deleted

### Analyzing Logs

**Using CloudWatch Logs Insights**:
```sql
fields @timestamp, cs-uri-stem, sc-status, time-taken
| filter sc-status >= 400
| sort @timestamp desc
| limit 100
```

**Using Athena**:
```sql
SELECT 
  date_format(from_unixtime(time), '%Y-%m-%d %H:00:00') as hour,
  COUNT(*) as requests,
  AVG(time_taken) as avg_time,
  SUM(bytes) as total_bytes
FROM cloudfront_logs
WHERE date >= '2024-01-01'
GROUP BY 1
ORDER BY 1 DESC
```

## Security

### HTTPS Configuration

- **Minimum TLS**: 1.2 (2021 security policy)
- **HTTP**: Automatically redirects to HTTPS
- **Cipher Suites**: Modern, secure ciphers only

### Security Headers

Automatically applied to all responses:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

### WAF Protection

The distribution is protected by AWS WAF with:
- Rate limiting (100 requests per 5 minutes per IP)
- CAPTCHA challenges for suspicious traffic
- IP reputation lists
- Custom rules for known attack patterns

### S3 Bucket Security

- **Public Access**: Blocked (all four settings)
- **Encryption**: Server-side encryption enabled
- **Versioning**: Enabled for rollback
- **Access**: CloudFront OAI only (no direct access)

## Performance Optimization

### Origin Shield

**Benefits**:
- Reduces origin requests by 30-60%
- Improves cache hit ratio by 10-20%
- Lowers S3 data transfer costs
- Adds additional caching layer

**Cost**: $0.01 per 10,000 requests (minimal)

### Compression

**Automatic compression** for:
- JavaScript (`.js`)
- CSS (`.css`)
- HTML (`.html`)
- JSON (`.json`)
- SVG (`.svg`)
- Text files (`.txt`)

**Savings**: 50-70% bandwidth reduction

### HTTP/2 and HTTP/3

- **HTTP/2**: Multiplexing, header compression
- **HTTP/3**: QUIC protocol, faster connections
- **Automatic**: Enabled for all clients that support it

## Cost Estimation

### Monthly Costs (Staging)

Assuming 10,000 requests/day, 100MB average daily traffic:

| Service | Cost |
|---------|------|
| CloudFront (300K requests) | $0.30 |
| CloudFront (3GB data transfer) | $0.26 |
| Origin Shield (300K requests) | $3.00 |
| S3 Storage (1GB) | $0.02 |
| S3 Requests (300K GET) | $0.12 |
| WAF (300K requests) | $6.00 |
| **Total** | **~$9.70/month** |

### Monthly Costs (Production)

Assuming 1M requests/day, 10GB average daily traffic:

| Service | Cost |
|---------|------|
| CloudFront (30M requests) | $30.00 |
| CloudFront (300GB data transfer) | $26.00 |
| Origin Shield (30M requests) | $300.00 |
| S3 Storage (10GB) | $0.23 |
| S3 Requests (30M GET) | $12.00 |
| WAF (30M requests) | $600.00 |
| **Total** | **~$968/month** |

**Note**: Actual costs depend on traffic patterns, cache hit ratio, and compression effectiveness.

## Troubleshooting

### Issue: 403 Forbidden

**Symptoms**: All requests return 403 Forbidden

**Causes**:
1. S3 bucket is empty
2. OAI doesn't have read permissions
3. Default root object not set

**Solutions**:
1. Upload files to S3 bucket
2. Verify OAI has read permissions (check bucket policy)
3. Ensure `index.html` exists in bucket root

### Issue: Cache Not Working

**Symptoms**: X-Cache header always shows "Miss from cloudfront"

**Causes**:
1. Query strings in URLs
2. Cookies being sent
3. Cache policy not configured correctly

**Solutions**:
1. Remove query strings from static asset URLs
2. Check cache policy ignores query strings and cookies
3. Wait 5-10 minutes for cache to warm up

### Issue: Custom Domain Not Working

**Symptoms**: Domain doesn't resolve or shows certificate error

**Causes**:
1. Certificate not in us-east-1
2. DNS not propagated
3. Certificate not validated

**Solutions**:
1. Verify certificate is in us-east-1 region
2. Wait for DNS propagation (up to 48 hours)
3. Check certificate validation status
4. Verify Route 53 A record points to CloudFront

### Issue: Slow Performance

**Symptoms**: High latency, slow page loads

**Causes**:
1. Origin Shield not enabled
2. Low cache hit ratio
3. Compression not working
4. Large unoptimized assets

**Solutions**:
1. Enable Origin Shield (already enabled in our stack)
2. Increase cache TTLs
3. Verify compression is enabled
4. Optimize images and assets
5. Use code splitting for JavaScript

## Best Practices

### 1. Always Use HTTPS
- HTTP automatically redirects to HTTPS
- TLS 1.2 minimum enforced

### 2. Optimize Cache Hit Ratio
- Target: > 80% cache hit ratio
- Use appropriate TTLs for different content types
- Avoid query strings on static assets

### 3. Monitor Performance
- Set up CloudWatch alarms
- Review access logs regularly
- Monitor cache hit ratio

### 4. Regular Cache Invalidations
- Invalidate after deployments
- Use wildcard for efficiency
- Consider versioned URLs to avoid invalidations

### 5. Test in Staging First
- Always deploy to staging first
- Verify all functionality
- Load test before production

### 6. Use Custom Domain
- Better branding
- Improved SEO
- Professional appearance

### 7. Enable Access Logs
- Essential for troubleshooting
- Useful for analytics
- Required for compliance

### 8. Implement Security Headers
- Already configured in our stack
- Protects against common attacks
- Improves security posture

### 9. Regular Backups
- S3 versioning enabled
- Daily snapshots
- Cross-region replication for DR

### 10. Cost Optimization
- Use Origin Shield
- Enable compression
- Set appropriate cache TTLs
- Monitor and optimize

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build frontend
        run: pnpm build
        working-directory: apps/web
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Upload to S3
        run: |
          aws s3 sync apps/web/dist/ s3://${{ secrets.S3_BUCKET }}/ --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.DISTRIBUTION_ID }} \
            --paths "/*"
```

## Support and Resources

### Documentation
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [S3 User Guide](https://docs.aws.amazon.com/s3/)
- [WAF Developer Guide](https://docs.aws.amazon.com/waf/)
- [Route 53 Developer Guide](https://docs.aws.amazon.com/route53/)

### Internal Documentation
- `infra/CLOUDFRONT_CONFIGURATION.md` - Detailed CloudFront configuration
- `infra/TASK_18.2_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `infra/scripts/README.md` - Script documentation

### Getting Help
- Check CloudWatch logs for errors
- Review access logs for traffic patterns
- Run verification script for configuration issues
- Contact AWS Support for infrastructure issues

## Appendix

### Useful Commands

**List all distributions**:
```bash
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,DomainName,Status]" --output table
```

**Get distribution configuration**:
```bash
aws cloudfront get-distribution-config --id E1234567890ABC
```

**List S3 bucket contents**:
```bash
aws s3 ls s3://trivia-nft-web-staging-123456789012/ --recursive
```

**Check bucket versioning**:
```bash
aws s3api get-bucket-versioning --bucket trivia-nft-web-staging-123456789012
```

**View CloudWatch metrics**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Environment-Specific Configuration

**Staging**:
- Environment: `staging`
- Domain: CloudFront default (d123456.cloudfront.net)
- Certificate: Not required
- WAF: Enabled (testing mode)

**Production**:
- Environment: `production`
- Domain: Custom domain (app.trivianft.com)
- Certificate: ACM certificate in us-east-1
- WAF: Enabled (enforcement mode)
