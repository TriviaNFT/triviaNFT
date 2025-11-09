# Authentication Lambda Functions

This directory contains the authentication Lambda functions for the TriviaNFT platform.

## Endpoints

### POST /auth/connect
**Handler:** `connect.ts`

Wallet connection endpoint that:
- Validates stake key format (Cardano stake1... format)
- Checks if player exists in database
- Creates new player record if first-time connection
- Generates JWT token with 24-hour expiration
- Returns token and player info

**Request:**
```json
{
  "stakeKey": "stake1..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "player": {
    "id": "uuid",
    "stakeKey": "stake1...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastSeenAt": "2024-01-01T00:00:00Z"
  },
  "isNewUser": false
}
```

### POST /auth/profile
**Handler:** `profile.ts`

Profile creation endpoint that:
- Requires valid JWT token (authenticated)
- Validates username uniqueness
- Validates username format (3-20 chars, alphanumeric + underscore/hyphen)
- Validates email format (optional)
- Creates/updates player profile
- Associates username with player

**Request:**
```json
{
  "username": "player123",
  "email": "player@example.com"
}
```

**Response:**
```json
{
  "player": {
    "id": "uuid",
    "stakeKey": "stake1...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastSeenAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /auth/me
**Handler:** `me.ts`

Current user endpoint that:
- Requires valid JWT token (authenticated)
- Fetches player info from database
- Calculates remaining daily plays
- Returns player profile with stats

**Response:**
```json
{
  "player": {
    "id": "uuid",
    "stakeKey": "stake1...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastSeenAt": "2024-01-01T00:00:00Z"
  },
  "remainingPlays": 10,
  "resetAt": "2024-01-02T05:00:00Z"
}
```

## Supporting Files

### `services/api/src/utils/jwt.ts`
JWT token utilities:
- `generateToken()` - Creates JWT with HMAC SHA256 signature
- `verifyToken()` - Validates and decodes JWT
- `extractTokenFromHeader()` - Extracts Bearer token from Authorization header
- Secrets Manager integration for JWT secret with 5-minute caching

### `services/api/src/services/auth-service.ts`
Authentication business logic:
- `connectWallet()` - Handles wallet connection flow
- `createProfile()` - Handles profile creation
- `getCurrentUser()` - Fetches current user info

## Security Features

1. **JWT Tokens:**
   - HMAC SHA256 signature
   - 24-hour expiration
   - Stored secret in AWS Secrets Manager
   - Includes player ID, stake key, and username in claims

2. **Input Validation:**
   - Stake key format validation (Cardano CIP-5)
   - Username format validation (alphanumeric + underscore/hyphen)
   - Email format validation
   - Zod schema validation for all requests

3. **Error Handling:**
   - Structured error responses
   - Proper HTTP status codes
   - Sanitized error messages
   - Request logging for debugging

## Requirements Satisfied

- **Requirement 5:** First-time wallet connection with profile creation
- **Requirement 42:** CIP-30 wallet connection support
- **Requirement 43:** Mobile wallet connection support
- **Requirement 45:** JWT authentication with Secrets Manager

## Next Steps

The authentication endpoints are now ready for integration with:
1. API Gateway HTTP API (ApiStack)
2. Frontend wallet connection flow
3. Session management endpoints (will use JWT for authentication)
4. Redis for daily session limits tracking
