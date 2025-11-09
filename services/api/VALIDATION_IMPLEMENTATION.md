# Input Validation Implementation

## Overview

This document describes the comprehensive input validation implementation for the TriviaNFT API, covering Zod schema validation, input sanitization, and security best practices.

## Implementation Status

✅ **Completed:**
- Zod schemas for all API request types
- Validation middleware for Lambda handlers
- Sanitization utilities for user input
- Cardano wallet address and stake key validation
- Content length validation
- Path and query parameter validation

## Validation Layers

### 1. Schema Validation (Zod)

All API endpoints use Zod schemas defined in `packages/shared/src/types/schemas.ts`:

```typescript
// Example: Start session request
export const startSessionRequestSchema = z.object({
  categoryId: uuidSchema,
});

// Example: Submit answer request
export const submitAnswerRequestSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(10000),
});

// Example: Forge request
export const initiateForgeRequestSchema = z.object({
  type: forgeTypeSchema,
  categoryId: uuidSchema.optional(),
  seasonId: z.string().optional(),
  inputFingerprints: z.array(z.string()).min(1),
});
```

### 2. Validation Middleware

The `validation-middleware.ts` provides reusable validation functions:

```typescript
import { validateRequestBody, validateContentLength, sanitizeObject } from '@trivia-nft/shared';

// In handler
const contentLengthCheck = validateContentLength(event, 1024 * 50); // 50KB max
if (!contentLengthCheck.success) {
  return contentLengthCheck.response;
}

const bodyValidation = validateRequestBody(event, mySchema);
if (!bodyValidation.success) {
  return bodyValidation.response;
}

const sanitizedData = sanitizeObject(bodyValidation.data);
```

### 3. Input Sanitization

Multiple levels of sanitization are applied:

**String Sanitization:**
```typescript
// Remove dangerous characters
sanitizeString(input) // Removes <>, javascript:, event handlers, etc.

// HTML sanitization
sanitizeHtml(input) // Removes script tags, iframes, objects, etc.

// Database sanitization
sanitizeForDatabase(input) // Removes null bytes and control characters
```

**Object Sanitization:**
```typescript
// Recursively sanitize all string fields
const sanitized = sanitizeObject(requestBody);
```

### 4. Cardano-Specific Validation

**Stake Key Validation:**
```typescript
// Schema validation
export const stakeKeySchema = z.string().regex(/^stake1[a-z0-9]{53}$/, {
  message: 'Invalid Cardano stake key format',
});

// Utility validation
const sanitized = validateAndSanitizeStakeKey(input);
if (!sanitized) {
  throw new ValidationError('Invalid stake key');
}
```

**Address Validation:**
```typescript
// Schema validation
export const cardanoAddressSchema = z.string().regex(/^addr1[a-z0-9]{58,}$/, {
  message: 'Invalid Cardano address format',
});

// Utility validation
const sanitized = validateAndSanitizeAddress(input);
if (!sanitized) {
  throw new ValidationError('Invalid address');
}
```

## Handler Implementation Pattern

### Standard Pattern

```typescript
import { 
  validateRequestBody, 
  validateContentLength,
  validatePathParameters,
  sanitizeObject,
  myRequestSchema,
} from '@trivia-nft/shared';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    // 1. Validate content length
    const contentCheck = validateContentLength(event, 1024 * 100);
    if (!contentCheck.success) {
      return contentCheck.response;
    }

    // 2. Validate path parameters (if needed)
    const pathCheck = validatePathParameters(event, ['id']);
    if (!pathCheck.success) {
      return pathCheck.response;
    }

    // 3. Validate request body
    const bodyValidation = validateRequestBody(event, myRequestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // 4. Sanitize inputs
    const sanitizedData = sanitizeObject(bodyValidation.data);

    // 5. Process request with validated and sanitized data
    // ... business logic ...

  } catch (error) {
    // Error handling
  }
};
```

## Validation Rules by Endpoint

### Authentication Endpoints

**POST /auth/connect**
- Validates stake key format (stake1 + 53 chars)
- Sanitizes stake key (lowercase, trim)
- Content length: 1KB max

**POST /auth/profile**
- Username: 3-20 chars, alphanumeric + underscore/hyphen
- Email: Valid email format (optional)
- Sanitizes all string inputs
- Content length: 5KB max

### Session Endpoints

**POST /sessions/start**
- Category ID: Valid UUID
- Content length: 1KB max

**POST /sessions/{id}/answer**
- Question index: 0-9
- Option index: 0-3
- Time: 0-10000ms
- Content length: 1KB max

**POST /sessions/{id}/complete**
- Session ID: Valid UUID (path param)
- Content length: 1KB max

### Mint Endpoints

**POST /mint/{eligibilityId}**
- Eligibility ID: Valid UUID (path param)
- Content length: 1KB max

### Forge Endpoints

**POST /forge/{type}**
- Type: 'category' | 'master' | 'season'
- Category ID: Valid UUID (conditional)
- Season ID: String (conditional)
- Input fingerprints: Array of strings, min 1
- Content length: 50KB max (larger due to fingerprint array)

### Question Endpoints

**POST /questions/flag**
- Question ID: Valid UUID
- Reason: 10-500 chars
- Sanitizes reason text
- Content length: 5KB max

## Security Considerations

### 1. SQL Injection Prevention
- All database queries use parameterized statements
- Input sanitization removes null bytes and control characters
- Zod validation ensures type safety

### 2. XSS Prevention
- HTML sanitization removes script tags and event handlers
- Content-Security-Policy headers prevent inline scripts
- All user-generated content is sanitized before storage

### 3. Command Injection Prevention
- No shell commands are executed with user input
- All external API calls use validated and sanitized inputs

### 4. Path Traversal Prevention
- UUID validation prevents path traversal in IDs
- No file system operations use user input directly

### 5. DoS Prevention
- Content length validation limits payload size
- API Gateway throttling limits request rate
- WAF rules protect against volumetric attacks

## Error Handling

Validation errors return structured responses:

```json
{
  "error": "Validation failed",
  "details": {
    "categoryId": ["Invalid UUID format"],
    "questionIndex": ["Must be between 0 and 9"]
  }
}
```

## Testing Validation

### Unit Tests

```typescript
describe('Validation', () => {
  it('should reject invalid stake key', () => {
    const result = stakeKeySchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should accept valid stake key', () => {
    const result = stakeKeySchema.safeParse('stake1' + 'a'.repeat(53));
    expect(result.success).toBe(true);
  });

  it('should sanitize dangerous input', () => {
    const input = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain('<script>');
  });
});
```

### Integration Tests

Test validation at the handler level:

```typescript
describe('POST /sessions/start', () => {
  it('should reject invalid category ID', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ categoryId: 'invalid' }),
    });
    
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
  });

  it('should accept valid request', async () => {
    const event = createMockEvent({
      body: JSON.stringify({ 
        categoryId: '123e4567-e89b-12d3-a456-426614174000' 
      }),
    });
    
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });
});
```

## Maintenance

### Adding New Validation

1. Define Zod schema in `packages/shared/src/types/schemas.ts`
2. Export schema from `packages/shared/src/types/index.ts`
3. Use validation middleware in handler
4. Add tests for new validation rules

### Updating Validation Rules

1. Update Zod schema
2. Update validation utilities if needed
3. Update tests
4. Document changes in this file

## References

- Zod Documentation: https://zod.dev/
- OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- AWS Lambda Security: https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html
