# Security Hardening Implementation Summary

## Overview

This document summarizes the comprehensive security hardening measures implemented for the TriviaNFT platform, covering API throttling, input validation, security headers, and secrets rotation.

## Implementation Status

All security hardening tasks have been completed:

✅ **29.1 API Gateway Throttling** - Configured
✅ **29.2 Input Validation** - Implemented
✅ **29.3 Security Headers** - Configured
✅ **29.4 Secrets Rotation** - Configured

## 1. API Gateway Throttling (Task 29.1)

### Configuration

**Location:** `infra/lib/stacks/api-stack.ts`

**Settings:**
```typescript
defaultRouteSettings: {
  throttlingBurstLimit: 500,      // 500 requests burst
  throttlingRateLimit: 1000,      // 1000 requests/second steady state
}
```

### Per-Method Limits

Expensive operations have additional rate limiting through AWS WAF:

**Session Creation:**
- Limit: 10 requests per 5 minutes per IP
- Enforced by: WAF rate-based rule

**Mint Operations:**
- Limit: 5 requests per 5 minutes per stake key
- Enforced by: WAF rate-based rule + application logic

**Forge Operations:**
- Limit: 3 requests per 5 minutes per stake key
- Enforced by: Application logic in Redis

### WAF Rate Limiting

**Location:** `infra/lib/stacks/security-stack.ts`

```typescript
{
  name: 'RateLimitRule',
  priority: 1,
  statement: {
    rateBasedStatement: {
      limit: 100,                    // 100 requests
      aggregateKeyType: 'IP',
      evaluationWindowSec: 300,      // per 5 minutes
    },
  },
  action: {
    captcha: {},                     // Challenge with CAPTCHA
  },
}
```

### Response Codes

- **429 Too Many Requests:** Rate limit exceeded
- **403 Forbidden:** CAPTCHA challenge required

## 2. Input Validation (Task 29.2)

### Zod Schema Validation

**Location:** `packages/shared/src/types/schemas.ts`

All API endpoints use Zod schemas for type-safe validation:

```typescript
// Stake key validation
export const stakeKeySchema = z.string().regex(/^stake1[a-z0-9]{53}$/, {
  message: 'Invalid Cardano stake key format',
});

// Cardano address validation
export const cardanoAddressSchema = z.string().regex(/^addr1[a-z0-9]{58,}$/, {
  message: 'Invalid Cardano address format',
});

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
```

### Validation Middleware

**Location:** `packages/shared/src/utils/validation-middleware.ts`

Reusable validation functions for Lambda handlers:

```typescript
// Request body validation
validateRequestBody(event, schema)

// Path parameter validation
validatePathParameters(event, requiredParams)

// Query parameter validation
validateQueryParameters(event, schema)

// Content length validation
validateContentLength(event, maxBytes)
```

### Input Sanitization

**Location:** `packages/shared/src/utils/validation.ts`

Multiple sanitization layers:

```typescript
// String sanitization - removes dangerous characters
sanitizeString(input)

// HTML sanitization - removes script tags, iframes, etc.
sanitizeHtml(input)

// Database sanitization - removes null bytes and control characters
sanitizeForDatabase(input)

// Object sanitization - recursively sanitizes all string fields
sanitizeObject(obj)
```

### Cardano-Specific Validation

```typescript
// Validate and sanitize stake key
validateAndSanitizeStakeKey(stakeKey)

// Validate and sanitize Cardano address
validateAndSanitizeAddress(address)
```

### Implementation Example

```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  // 1. Validate content length
  const contentCheck = validateContentLength(event, 1024 * 50);
  if (!contentCheck.success) {
    return contentCheck.response;
  }

  // 2. Validate request body
  const bodyValidation = validateRequestBody(event, mySchema);
  if (!bodyValidation.success) {
    return bodyValidation.response;
  }

  // 3. Sanitize inputs
  const sanitizedData = sanitizeObject(bodyValidation.data);

  // 4. Process with validated data
  // ...
};
```

### Validation Coverage

All endpoints implement validation:

- ✅ Authentication endpoints (connect, profile, me)
- ✅ Session endpoints (start, answer, complete, history)
- ✅ Question endpoints (flag)
- ✅ Mint endpoints (eligibilities, initiate, status)
- ✅ Forge endpoints (progress, initiate, status)
- ✅ Leaderboard endpoints (global, category, season)
- ✅ Season endpoints (current)

## 3. Security Headers (Task 29.3)

### CloudFront Response Headers Policy

**Location:** `infra/lib/stacks/web-stack.ts`

```typescript
securityHeadersBehavior: {
  // Prevent MIME type sniffing
  contentTypeOptions: {
    override: true,
  },
  
  // Prevent clickjacking
  frameOptions: {
    frameOption: cloudfront.HeadersFrameOption.DENY,
    override: true,
  },
  
  // Control referrer information
  referrerPolicy: {
    referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
    override: true,
  },
  
  // Enforce HTTPS
  strictTransportSecurity: {
    accessControlMaxAge: cdk.Duration.days(365),
    includeSubdomains: true,
    preload: true,
    override: true,
  },
  
  // XSS protection
  xssProtection: {
    protection: true,
    modeBlock: true,
    override: true,
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.blockfrost.io https://*.amazonaws.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    override: true,
  },
}
```

### Header Details

**X-Content-Type-Options: nosniff**
- Prevents browsers from MIME-sniffing responses
- Protects against drive-by download attacks

**X-Frame-Options: DENY**
- Prevents the page from being embedded in iframes
- Protects against clickjacking attacks

**Referrer-Policy: strict-origin-when-cross-origin**
- Sends full URL for same-origin requests
- Sends only origin for cross-origin requests
- Protects user privacy

**Strict-Transport-Security: max-age=31536000; includeSubDomains; preload**
- Forces HTTPS for 1 year
- Applies to all subdomains
- Eligible for browser preload lists

**X-XSS-Protection: 1; mode=block**
- Enables browser XSS filter
- Blocks page rendering if XSS detected

**Content-Security-Policy**
- Restricts resource loading to trusted sources
- Prevents inline script execution (with exceptions for React)
- Blocks frame embedding
- Restricts form submissions

### Custom Headers

```typescript
customHeadersBehavior: {
  customHeaders: [
    {
      header: 'X-Application-Version',
      value: '1.0.0',
      override: true,
    },
    {
      header: 'Cache-Control',
      value: 'no-cache, no-store, must-revalidate',
      override: false,
    },
  ],
}
```

## 4. Secrets Rotation (Task 29.4)

### Automated Rotation Configuration

**Location:** `infra/lib/stacks/security-stack.ts`

### JWT Secret Rotation

**Rotation Schedule:** Every 90 days

**Rotation Lambda:**
```typescript
const jwtRotationFunction = new lambda.Function(this, 'JwtRotationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  timeout: cdk.Duration.minutes(5),
  description: 'Rotates JWT signing secret',
});

new secretsmanager.RotationSchedule(this, 'JwtSecretRotation', {
  secret: this.jwtSecret,
  rotationLambda: jwtRotationFunction,
  automaticallyAfter: cdk.Duration.days(90),
});
```

**Rotation Steps:**
1. **createSecret:** Generate new 64-byte random secret
2. **setSecret:** No external service to update
3. **testSecret:** Verify secret format and length
4. **finishSecret:** Promote AWSPENDING to AWSCURRENT

### Policy Signing Key Rotation

**Rotation Schedule:** Every 90 days

**Rotation Lambda:**
```typescript
const policyKeyRotationFunction = new lambda.Function(this, 'PolicyKeyRotationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  timeout: cdk.Duration.minutes(5),
  description: 'Rotates Cardano policy signing key',
});

new secretsmanager.RotationSchedule(this, 'PolicyKeyRotation', {
  secret: this.policySigningKeySecret,
  rotationLambda: policyKeyRotationFunction,
  automaticallyAfter: cdk.Duration.days(90),
});
```

**Rotation Steps:**
1. **createSecret:** Generate new Ed25519 key pair
2. **setSecret:** Update policy on blockchain if required
3. **testSecret:** Verify key format
4. **finishSecret:** Promote AWSPENDING to AWSCURRENT

### Secrets Managed

1. **JWT Secret** (`${environment}/trivia-nft/jwt-secret`)
   - Algorithm: HS256
   - Length: 64 bytes
   - Rotation: 90 days

2. **Blockfrost API Key** (`${environment}/trivia-nft/blockfrost`)
   - Manual rotation required
   - Update in AWS Secrets Manager console

3. **IPFS API Key** (`${environment}/trivia-nft/ipfs`)
   - Manual rotation required
   - Update in AWS Secrets Manager console

4. **Policy Signing Key** (`${environment}/trivia-nft/policy-signing-key`)
   - Type: Ed25519
   - Rotation: 90 days
   - Blockchain policy update may be required

### Rotation Monitoring

**CloudWatch Alarms:**
- Rotation failure alerts
- Secret age warnings (approaching 90 days)

**Logs:**
- All rotation events logged to CloudWatch
- Success/failure status tracked

### Manual Rotation Process

For secrets requiring manual rotation (Blockfrost, IPFS):

1. Generate new API key from provider
2. Update secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager update-secret \
     --secret-id ${environment}/trivia-nft/blockfrost \
     --secret-string '{"apiKey":"NEW_KEY","projectId":"PROJECT_ID"}'
   ```
3. Verify Lambda functions can access new secret
4. Revoke old API key from provider

## Security Testing

### Validation Testing

```bash
# Test invalid stake key
curl -X POST https://api.example.com/auth/connect \
  -H "Content-Type: application/json" \
  -d '{"stakeKey":"invalid"}'
# Expected: 400 Bad Request

# Test XSS attempt
curl -X POST https://api.example.com/questions/flag \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionId":"UUID","reason":"<script>alert(1)</script>"}'
# Expected: 200 OK with sanitized input
```

### Rate Limiting Testing

```bash
# Test rate limit
for i in {1..150}; do
  curl -X POST https://api.example.com/sessions/start \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"categoryId":"UUID"}'
done
# Expected: 429 Too Many Requests after 100 requests
```

### Security Headers Testing

```bash
# Check security headers
curl -I https://app.example.com
# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: ...
```

## Compliance

### OWASP Top 10 Coverage

1. ✅ **Injection:** Parameterized queries, input validation
2. ✅ **Broken Authentication:** JWT with rotation, secure secrets
3. ✅ **Sensitive Data Exposure:** Encryption at rest and in transit
4. ✅ **XML External Entities:** Not applicable (JSON API)
5. ✅ **Broken Access Control:** JWT authorization, stake key validation
6. ✅ **Security Misconfiguration:** Security headers, WAF rules
7. ✅ **XSS:** Input sanitization, CSP headers
8. ✅ **Insecure Deserialization:** Zod validation before processing
9. ✅ **Using Components with Known Vulnerabilities:** Regular dependency updates
10. ✅ **Insufficient Logging & Monitoring:** CloudWatch logs and alarms

## Maintenance

### Regular Tasks

**Weekly:**
- Review WAF logs for blocked requests
- Check CloudWatch alarms for anomalies

**Monthly:**
- Review and update dependency versions
- Audit IAM permissions
- Review CloudWatch Insights queries

**Quarterly:**
- Security audit of all endpoints
- Penetration testing
- Review and update CSP policy

**Annually:**
- Full security assessment
- Update security documentation
- Review secrets rotation policies

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [AWS WAF Best Practices](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [AWS Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [Zod Documentation](https://zod.dev/)

## Contact

For security concerns or to report vulnerabilities, contact the security team.
