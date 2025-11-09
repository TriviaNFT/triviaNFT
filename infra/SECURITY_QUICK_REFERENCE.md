# SecurityStack Quick Reference

## For Developers

### Accessing Secrets in Lambda Functions

1. **Attach the Secrets Access Policy to your Lambda execution role**:
```typescript
// In your Lambda construct
const myFunction = new lambda.Function(this, 'MyFunction', {
  // ... other props
});

// Grant access to secrets
securityStack.secretsAccessPolicy.attachToRole(myFunction.role!);
```

2. **Read secrets in your Lambda code**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Get JWT secret
const jwtSecretResponse = await client.send(
  new GetSecretValueCommand({
    SecretId: process.env.JWT_SECRET_ARN,
  })
);
const jwtSecret = JSON.parse(jwtSecretResponse.SecretString!);
console.log('JWT Algorithm:', jwtSecret.algorithm);
console.log('JWT Secret:', jwtSecret.secret);

// Get Blockfrost credentials
const blockfrostResponse = await client.send(
  new GetSecretValueCommand({
    SecretId: process.env.BLOCKFROST_SECRET_ARN,
  })
);
const blockfrost = JSON.parse(blockfrostResponse.SecretString!);
console.log('Blockfrost URL:', blockfrost.url);
console.log('Blockfrost API Key:', blockfrost.apiKey);
```

3. **Environment variables to set**:
```typescript
const myFunction = new lambda.Function(this, 'MyFunction', {
  environment: {
    JWT_SECRET_ARN: securityStack.jwtSecret.secretArn,
    BLOCKFROST_SECRET_ARN: securityStack.blockfrostSecret.secretArn,
    IPFS_SECRET_ARN: securityStack.ipfsSecret.secretArn,
    POLICY_KEY_SECRET_ARN: securityStack.policySigningKeySecret.secretArn,
  },
});
```

## For DevOps

### Deploying the SecurityStack

```bash
# Deploy to staging
cd infra
pnpm run cdk deploy TriviaNFT-Security-staging --context environment=staging

# Deploy to production
pnpm run cdk deploy TriviaNFT-Security-production --context environment=production
```

### Updating Secrets After Deployment

```bash
# Update Blockfrost API key
aws secretsmanager update-secret \
  --secret-id staging/trivia-nft/blockfrost \
  --secret-string '{
    "projectId": "YOUR_PROJECT_ID",
    "network": "preprod",
    "url": "https://cardano-preprod.blockfrost.io/api/v0",
    "apiKey": "YOUR_BLOCKFROST_API_KEY"
  }'

# Update IPFS API key
aws secretsmanager update-secret \
  --secret-id staging/trivia-nft/ipfs \
  --secret-string '{
    "provider": "blockfrost",
    "fallbackProvider": "nft.storage",
    "apiKey": "YOUR_IPFS_API_KEY"
  }'

# Update policy signing key (use real Cardano key)
aws secretsmanager update-secret \
  --secret-id staging/trivia-nft/policy-signing-key \
  --secret-string '{
    "type": "PaymentSigningKeyShelley_ed25519",
    "cborHex": "YOUR_CARDANO_KEY_CBOR_HEX",
    "description": "Production policy signing key"
  }'
```

### Monitoring WAF

```bash
# View WAF metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=TriviaNFT-staging-WebAcl \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum

# Download WAF logs from S3
aws s3 sync s3://trivia-nft-waf-logs-staging-ACCOUNT/AWSLogs/ ./waf-logs/

# Query WAF logs with CloudWatch Insights
# Go to CloudWatch > Insights > Select log group: aws-wafv2-logs-*
# Query example:
fields @timestamp, httpRequest.clientIp, action, terminatingRuleId
| filter action = "BLOCK"
| stats count() by httpRequest.clientIp
| sort count desc
```

### Testing Rate Limiting

```bash
# Test rate limiting (should trigger CAPTCHA after 100 requests in 5 minutes)
for i in {1..150}; do
  curl -I https://your-cloudfront-domain.com/api/test
  sleep 2
done

# Check if CAPTCHA is triggered (look for 405 status or CAPTCHA challenge)
```

### Secret Rotation

```bash
# Manually trigger rotation (for testing)
aws secretsmanager rotate-secret \
  --secret-id staging/trivia-nft/jwt-secret

# Check rotation status
aws secretsmanager describe-secret \
  --secret-id staging/trivia-nft/jwt-secret \
  --query 'RotationEnabled'

# View rotation schedule
aws secretsmanager describe-secret \
  --secret-id staging/trivia-nft/jwt-secret \
  --query 'RotationRules'
```

## WAF Rule Configuration

### Rate Limiting
- **Limit**: 100 requests per 5 minutes per IP
- **Action**: CAPTCHA challenge
- **Immunity**: 5 minutes after successful CAPTCHA solve

### Managed Rules
1. **IP Reputation**: Blocks known malicious IPs
2. **Anonymous IP**: Challenges VPNs, proxies, Tor
3. **Common Rule Set**: Protects against common web attacks
4. **Known Bad Inputs**: Blocks SQL injection, XSS
5. **Bot Control**: Detects and blocks automated traffic

### Customizing WAF Rules

To adjust rate limits, edit `infra/lib/stacks/security-stack.ts`:

```typescript
{
  name: 'RateLimitRule',
  priority: 1,
  statement: {
    rateBasedStatement: {
      limit: 200, // Change from 100 to 200
      aggregateKeyType: 'IP',
      evaluationWindowSec: 300,
      // ...
    },
  },
  // ...
}
```

Then redeploy:
```bash
pnpm run cdk deploy TriviaNFT-Security-staging
```

## Troubleshooting

### Lambda can't access secrets
- Verify the Lambda execution role has the `SecretsAccessPolicy` attached
- Check CloudWatch Logs for permission errors
- Verify the secret ARN is correct in environment variables

### WAF blocking legitimate traffic
- Review WAF logs in S3
- Check CloudWatch metrics for specific rule hits
- Adjust rule priorities or add exclusions
- Consider adding IP allowlist for known good IPs

### Secret rotation failing
- Check CloudWatch Logs for the rotation Lambda function
- Verify the rotation function has permission to update secrets
- Ensure the secret format is correct after rotation
- Test rotation manually before relying on automatic schedule

## Security Checklist

- [ ] Update Blockfrost API key after deployment
- [ ] Update IPFS API key after deployment
- [ ] Generate and update real Cardano policy signing key
- [ ] Attach `SecretsAccessPolicy` to all Lambda execution roles
- [ ] Set up CloudWatch alarms for WAF block rates
- [ ] Review WAF logs weekly for false positives
- [ ] Test secret rotation in staging before production
- [ ] Document any custom WAF rule changes
- [ ] Enable CloudTrail for secret access auditing
- [ ] Set up SNS notifications for security events
