# CloudFront Distribution Configuration

## Overview

The CloudFront distribution for TriviaNFT is configured with advanced features for performance, security, and cost optimization.

## Key Features

### 1. Origin Configuration

- **Origin Type**: S3 bucket with Origin Access Identity (OAI)
- **Origin Shield**: Enabled for cost optimization
  - Reduces origin requests by adding an additional caching layer
  - Configured in the same region as the S3 bucket
  - Helps reduce costs when multiple edge locations request the same content

### 2. Caching Policies

#### Static Assets Cache Policy (24-hour TTL)
- **Applies to**: `/static/*`, `/assets/*`, `/*.png`, `/*.ico`
- **Default TTL**: 24 hours
- **Max TTL**: 7 days
- **Min TTL**: 0 seconds
- **Compression**: Gzip and Brotli enabled
- **Query Strings**: None (ignored for caching)
- **Headers**: None (ignored for caching)
- **Cookies**: None (ignored for caching)

#### HTML Cache Policy (5-minute TTL)
- **Applies to**: Default behavior (HTML files)
- **Default TTL**: 5 minutes
- **Max TTL**: 1 hour
- **Min TTL**: 0 seconds
- **Compression**: Gzip and Brotli enabled
- **Purpose**: Shorter TTL for SPA routing and quick updates

### 3. Compression

- **Gzip**: Enabled for all content types
- **Brotli**: Enabled for all content types
- **Automatic**: CloudFront automatically compresses responses when:
  - Client supports compression (Accept-Encoding header)
  - Response is compressible (text, JSON, JavaScript, CSS, etc.)
  - Response size is between 1KB and 10MB

### 4. WAF Integration

- **WebACL**: Attached from SecurityStack
- **Protection**: Rate limiting, CAPTCHA challenges, IP reputation
- **Scope**: CloudFront (global)

### 5. Custom Domain Support

The distribution supports custom domains with the following configuration:

- **Certificate**: ACM certificate (must be in us-east-1 for CloudFront)
- **Domain Names**: Configurable via stack props
- **Route 53**: Automatic A record creation if hosted zone is provided
- **TLS**: Minimum TLS 1.2 (2021 policy)
- **HTTP Version**: HTTP/2 and HTTP/3 enabled

### 6. Security Headers

The distribution includes a comprehensive security headers policy:

#### Standard Security Headers
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains; preload`
- **X-XSS-Protection**: `1; mode=block`

#### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.blockfrost.io https://*.amazonaws.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Note**: `unsafe-inline` and `unsafe-eval` are required for React applications. Consider implementing nonces in production for stricter CSP.

### 7. Error Handling

- **404 Errors**: Redirected to `/index.html` (SPA routing)
- **403 Errors**: Redirected to `/index.html` (SPA routing)
- **TTL**: 5 minutes for error responses

### 8. Logging

- **Access Logs**: Enabled
- **Log Bucket**: Separate S3 bucket with lifecycle policies
- **Log Prefix**: `cloudfront/`
- **Retention**: 
  - 30 days: Standard storage
  - 90 days: Transition to Infrequent Access
  - Automatic deletion after 90 days

### 9. Performance Optimizations

- **Price Class**: PRICE_CLASS_100 (North America and Europe)
- **HTTP Version**: HTTP/2 and HTTP/3 for improved performance
- **Compression**: Automatic Gzip and Brotli compression
- **Origin Shield**: Reduces origin load and improves cache hit ratio

## Configuration Parameters

### Required Parameters
- `environment`: 'staging' or 'production'
- `webAcl`: WAF WebACL from SecurityStack

### Optional Parameters
- `domainName`: Custom domain name (e.g., 'app.trivianft.com')
- `hostedZoneId`: Route 53 hosted zone ID for DNS record creation
- `certificateArn`: ACM certificate ARN (must be in us-east-1)

## Usage Example

### Without Custom Domain
```typescript
const webStack = new WebStack(app, 'TriviaNFT-Web-staging', {
  environment: 'staging',
  webAcl: securityStack.webAcl,
});
```

### With Custom Domain
```typescript
const webStack = new WebStack(app, 'TriviaNFT-Web-production', {
  environment: 'production',
  webAcl: securityStack.webAcl,
  domainName: 'app.trivianft.com',
  hostedZoneId: 'Z1234567890ABC',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/...',
});
```

## Certificate Setup

To use a custom domain, you need an ACM certificate in us-east-1:

1. **Request Certificate**:
   ```bash
   aws acm request-certificate \
     --domain-name app.trivianft.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**:
   - Add the DNS validation records to your Route 53 hosted zone
   - Wait for validation to complete

3. **Get Certificate ARN**:
   ```bash
   aws acm list-certificates --region us-east-1
   ```

4. **Pass to Stack**:
   ```bash
   cdk deploy TriviaNFT-Web-production \
     -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/...
   ```

## Deployment

### Deploy Stack
```bash
cd infra
pnpm install
cdk deploy TriviaNFT-Web-staging
```

### Deploy with Context
```bash
cdk deploy TriviaNFT-Web-production \
  -c environment=production \
  -c domainName=app.trivianft.com \
  -c hostedZoneId=Z1234567890ABC \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/...
```

### Invalidate Cache
After deploying new frontend code:
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Monitoring

### CloudWatch Metrics
- **Requests**: Total number of requests
- **BytesDownloaded**: Total bytes served
- **4xxErrorRate**: Client error rate
- **5xxErrorRate**: Server error rate
- **CacheHitRate**: Percentage of requests served from cache

### Access Logs
Access logs are stored in the log bucket with the following format:
```
s3://trivia-nft-logs-{environment}-{account}/cloudfront/YYYY/MM/DD/
```

### Log Analysis
Use CloudWatch Logs Insights or Athena to analyze access logs:
```sql
SELECT 
  date_format(from_unixtime(time), '%Y-%m-%d %H:00:00') as hour,
  COUNT(*) as requests,
  SUM(bytes) as total_bytes,
  AVG(time_taken) as avg_time
FROM cloudfront_logs
WHERE date >= '2024-01-01'
GROUP BY 1
ORDER BY 1 DESC
```

## Cost Optimization

### Origin Shield Benefits
- Reduces origin requests by 30-60%
- Improves cache hit ratio
- Lowers data transfer costs from S3
- Small additional cost ($0.01 per 10,000 requests)

### Caching Strategy
- Static assets cached for 24 hours
- HTML files cached for 5 minutes
- Reduces origin requests and improves performance

### Price Class
- PRICE_CLASS_100 covers North America and Europe
- Lower cost than global distribution
- Suitable for initial launch
- Can upgrade to PRICE_CLASS_ALL for global coverage

## Troubleshooting

### Issue: 403 Forbidden Errors
**Cause**: OAI not properly configured or S3 bucket policy missing
**Solution**: Verify OAI has read permissions on S3 bucket

### Issue: Cache Not Working
**Cause**: Query strings or headers preventing caching
**Solution**: Check cache policy configuration and ensure query strings are ignored

### Issue: Custom Domain Not Working
**Cause**: Certificate not in us-east-1 or DNS not configured
**Solution**: 
1. Verify certificate is in us-east-1
2. Check Route 53 A record points to CloudFront distribution
3. Wait for DNS propagation (up to 48 hours)

### Issue: Slow Performance
**Cause**: Origin Shield not enabled or cache hit ratio low
**Solution**:
1. Enable Origin Shield
2. Increase cache TTLs
3. Review cache policies

## Security Considerations

### HTTPS Only
- All HTTP requests are redirected to HTTPS
- TLS 1.2 minimum (2021 security policy)
- Modern cipher suites only

### Origin Access Identity
- S3 bucket is not publicly accessible
- Only CloudFront can access the bucket
- Prevents direct S3 access

### WAF Protection
- Rate limiting prevents abuse
- CAPTCHA challenges for suspicious traffic
- IP reputation lists block known bad actors

### Security Headers
- Comprehensive security headers policy
- CSP prevents XSS attacks
- HSTS enforces HTTPS
- X-Frame-Options prevents clickjacking

## Best Practices

1. **Always use HTTPS**: Redirect HTTP to HTTPS
2. **Enable compression**: Reduces bandwidth and improves performance
3. **Use Origin Shield**: Reduces origin load and costs
4. **Set appropriate TTLs**: Balance freshness with cache hit ratio
5. **Monitor cache hit ratio**: Aim for >80% cache hit ratio
6. **Use custom domain**: Better branding and SEO
7. **Enable access logs**: Essential for troubleshooting and analytics
8. **Implement security headers**: Protect against common web vulnerabilities
9. **Regular cache invalidations**: After deploying new code
10. **Test in staging first**: Validate configuration before production

## References

- [CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)
- [CloudFront Caching](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html)
- [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- [Security Headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-response-headers.html)
- [Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
