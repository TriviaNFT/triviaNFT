# SecurityStack Implementation Summary

## Overview
This document describes the implementation of Task 3: "Implement SecurityStack with secrets and WAF" for the TriviaNFT platform.

## Subtask 3.1: Secrets Manager Configuration

### Secrets Created

1. **JWT Secret** (`${environment}/trivia-nft/jwt-secret`)
   - Purpose: JWT signing secret for authentication
   - Structure: `{ algorithm: 'HS256', secret: '<64-char-hex>' }`
   - Rotation: Automatic every 90 days
   - Rotation Function: Custom Lambda function that generates new cryptographically secure secrets

2. **Blockfrost Secret** (`${environment}/trivia-nft/blockfrost`)
   - Purpose: Blockfrost API credentials for Cardano blockchain access
   - Structure: `{ projectId, network, url, apiKey }`
   - Network: Preprod for staging, Mainnet for production
   - Note: API key must be manually updated after deployment

3. **IPFS Secret** (`${environment}/trivia-nft/ipfs`)
   - Purpose: IPFS/NFT.Storage API credentials for NFT metadata storage
   - Structure: `{ provider, fallbackProvider, apiKey }`
   - Supports multiple providers with fallback capability

4. **Policy Signing Key Secret** (`${environment}/trivia-nft/policy-signing-key`)
   - Purpose: Cardano policy signing key for NFT minting
   - Structure: `{ type: 'PaymentSigningKeyShelley_ed25519', cborHex, description }`
   - Rotation: Automatic every 90 days
   - Rotation Function: Custom Lambda function that generates new Ed25519 key pairs
   - Note: In production, coordinate rotation with blockchain policy updates

### Secret Rotation

- **JWT Secret**: Rotates every 90 days using a custom Lambda function
  - Generates new 64-character hex secret
  - Validates secret format before activation
  - Seamless rotation with AWSPENDING/AWSCURRENT version stages

- **Policy Signing Key**: Rotates every 90 days using a custom Lambda function
  - Generates new Ed25519 key pair
  - Placeholder for blockchain policy update logic
  - Critical: Coordinate with blockchain policy updates in production

### IAM Policies

Created a managed policy (`TriviaNFT-SecretsAccess-${environment}`) that grants Lambda functions:
- `secretsmanager:GetSecretValue` - Read secret values
- `secretsmanager:DescribeSecret` - Get secret metadata
- `kms:Decrypt` - Decrypt secrets (scoped to Secrets Manager service)

This policy can be attached to Lambda execution roles to grant access to all application secrets.

## Subtask 3.2: WAF Configuration

### WAF WebACL Rules

Created a comprehensive WAF WebACL with the following rules (in priority order):

1. **Rate Limiting Rule (Priority 1)**
   - Limit: 100 requests per 5 minutes per IP address
   - Action: CAPTCHA challenge
   - Scope: All requests except health checks
   - CAPTCHA immunity: 5 minutes after successful solve
   - Custom header: `x-rate-limited: true` added to rate-limited requests

2. **IP Reputation List (Priority 2)**
   - AWS Managed Rule: `AWSManagedRulesAmazonIpReputationList`
   - Blocks known malicious IP addresses
   - Automatically updated by AWS

3. **Anonymous IP List (Priority 3)**
   - AWS Managed Rule: `AWSManagedRulesAnonymousIpList`
   - Challenges requests from VPNs, proxies, and Tor exit nodes
   - Helps prevent abuse from anonymous sources

4. **Common Rule Set (Priority 4)**
   - AWS Managed Rule: `AWSManagedRulesCommonRuleSet`
   - Protection against common web threats
   - Excluded rules: `SizeRestrictions_BODY`, `GenericRFI_BODY` (to prevent false positives)

5. **Known Bad Inputs (Priority 5)**
   - AWS Managed Rule: `AWSManagedRulesKnownBadInputsRuleSet`
   - Blocks SQL injection, XSS, and other injection attacks
   - Validates input patterns

6. **Bot Control (Priority 6)**
   - AWS Managed Rule: `AWSManagedRulesBotControlRuleSet`
   - Inspection level: COMMON
   - Detects and blocks automated traffic
   - Allows legitimate bots (search engines, monitoring)

### WAF Logging

- **Destination**: S3 bucket (`trivia-nft-waf-logs-${environment}-${account}`)
- **Logging Filter**: Logs only BLOCK and CAPTCHA actions (reduces storage costs)
- **Redacted Fields**: 
  - `authorization` header (protects JWT tokens)
  - `cookie` header (protects session data)
- **Lifecycle Policy**:
  - Transition to Infrequent Access after 30 days
  - Delete after 90 days
  - Server access logging enabled

### Security Features

- **CAPTCHA Configuration**: 5-minute immunity after successful solve
- **CloudWatch Metrics**: Enabled for all rules with custom metric names
- **Sampled Requests**: Enabled for debugging and analysis
- **Scope**: CLOUDFRONT (for global distribution)

## Outputs

The stack exports the following values for use by other stacks:

- `${environment}-JwtSecretArn`: ARN of JWT secret
- `${environment}-BlockfrostSecretArn`: ARN of Blockfrost secret
- `${environment}-IpfsSecretArn`: ARN of IPFS secret
- `${environment}-PolicySigningKeySecretArn`: ARN of policy signing key secret
- `${environment}-WebAclArn`: ARN of WAF WebACL (for CloudFront association)
- `${environment}-WafLogBucketName`: Name of WAF log bucket
- `${environment}-SecretsAccessPolicyArn`: ARN of IAM policy for Lambda secret access

## Requirements Satisfied

### Requirement 44: Security - Rate Limiting
✅ Implemented AWS WAF rate limiting on API endpoints
✅ Limit: 100 requests per 5 minutes per IP address
✅ CAPTCHA challenge for rate-limited requests
✅ Returns HTTP 429 status (handled by WAF)
✅ CAPTCHA challenge for suspicious traffic patterns

### Requirement 45: Security - Authentication
✅ JWT secret stored in AWS Secrets Manager
✅ Automatic rotation every 90 days
✅ IAM policies configured for Lambda access
✅ Secrets encrypted at rest with AWS KMS
✅ Secure secret retrieval via IAM roles

## Post-Deployment Steps

1. **Update Blockfrost API Key**:
   ```bash
   aws secretsmanager update-secret \
     --secret-id ${environment}/trivia-nft/blockfrost \
     --secret-string '{"projectId":"YOUR_PROJECT_ID","network":"preprod","url":"https://cardano-preprod.blockfrost.io/api/v0","apiKey":"YOUR_API_KEY"}'
   ```

2. **Update IPFS API Key** (if using NFT.Storage):
   ```bash
   aws secretsmanager update-secret \
     --secret-id ${environment}/trivia-nft/ipfs \
     --secret-string '{"provider":"nft.storage","fallbackProvider":"blockfrost","apiKey":"YOUR_NFT_STORAGE_KEY"}'
   ```

3. **Generate Real Policy Signing Key**:
   - Use Cardano CLI to generate a proper payment signing key
   - Update the secret with the actual CBOR hex value
   ```bash
   cardano-cli address key-gen \
     --verification-key-file policy.vkey \
     --signing-key-file policy.skey
   
   # Extract CBOR hex and update secret
   aws secretsmanager update-secret \
     --secret-id ${environment}/trivia-nft/policy-signing-key \
     --secret-string '{"type":"PaymentSigningKeyShelley_ed25519","cborHex":"YOUR_CBOR_HEX","description":"Production policy signing key"}'
   ```

4. **Attach Secrets Access Policy to Lambda Roles**:
   - The `SecretsAccessPolicy` should be attached to Lambda execution roles in the ApiStack
   - This grants Lambda functions permission to read all application secrets

5. **Monitor WAF Logs**:
   - Set up CloudWatch Insights queries for WAF logs
   - Create alarms for high block rates or CAPTCHA challenge rates
   - Review blocked requests periodically to tune rules

## Testing

To verify the implementation:

1. **Secrets Verification**:
   ```bash
   # List all secrets
   aws secretsmanager list-secrets --filters Key=name,Values=staging/trivia-nft
   
   # Get a secret value (requires appropriate IAM permissions)
   aws secretsmanager get-secret-value --secret-id staging/trivia-nft/jwt-secret
   ```

2. **WAF Testing**:
   - Test rate limiting by sending 100+ requests in 5 minutes
   - Verify CAPTCHA challenge is presented
   - Check WAF logs in S3 bucket
   - Review CloudWatch metrics for rule hits

3. **Rotation Testing**:
   - Manually trigger rotation:
   ```bash
   aws secretsmanager rotate-secret \
     --secret-id staging/trivia-nft/jwt-secret
   ```
   - Verify new secret version is created
   - Confirm AWSCURRENT version is updated

## Cost Considerations

- **Secrets Manager**: $0.40/secret/month + $0.05 per 10,000 API calls
  - 4 secrets = ~$1.60/month
- **WAF**: $5/month + $1 per million requests + $0.60 per rule/month
  - Base: $5/month
  - 6 rules: $3.60/month
  - Estimated total: ~$10-20/month depending on traffic
- **S3 Storage (WAF logs)**: ~$0.023/GB/month
  - Estimated: $1-5/month depending on traffic

**Total estimated cost**: $15-30/month

## Security Best Practices

1. **Secret Rotation**: Automated rotation reduces risk of compromised credentials
2. **Least Privilege**: IAM policies grant only necessary permissions
3. **Encryption**: All secrets encrypted at rest with AWS KMS
4. **Audit Logging**: CloudTrail logs all secret access
5. **WAF Protection**: Multi-layered defense against common attacks
6. **Log Retention**: 90-day retention for compliance and forensics
7. **Redaction**: Sensitive headers redacted from WAF logs

## Future Enhancements

1. **Geo-blocking**: Add geographic restrictions if needed
2. **Custom Rules**: Add application-specific WAF rules
3. **Rate Limiting by Stake Key**: Implement application-level rate limiting
4. **Secret Versioning**: Implement blue-green secret rotation for zero-downtime
5. **Multi-Region**: Replicate secrets to additional regions for DR
6. **Advanced Bot Detection**: Upgrade to TARGETED inspection level
7. **Custom CAPTCHA**: Implement custom CAPTCHA challenges
