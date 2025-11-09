# TriviaNFT API Documentation

## Overview

The TriviaNFT API is a RESTful API built on AWS API Gateway and Lambda. It provides endpoints for trivia gameplay, NFT minting, forging, and leaderboards.

**Base URL**: `https://api.trivianft.com`

**API Version**: v1

## Authentication

### JWT Token Authentication

Most endpoints require authentication via JWT token in the Authorization header.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**Token Structure**:
```json
{
  "sub": "player-uuid",
  "stakeKey": "stake1...",
  "username": "player123",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Token Expiration**: 24 hours

### Obtaining a Token

Connect your Cardano wallet to receive a JWT token via the `/auth/connect` endpoint.

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |


### Error Response Format

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Request validation failed |
| `UNAUTHORIZED` | Authentication required or failed |
| `DAILY_LIMIT_REACHED` | Player has reached daily session limit |
| `SESSION_ACTIVE` | Player already has an active session |
| `COOLDOWN_ACTIVE` | Session cooldown period not expired |
| `ELIGIBILITY_EXPIRED` | Mint eligibility has expired |
| `ELIGIBILITY_USED` | Mint eligibility already used |
| `NFT_OUT_OF_STOCK` | No NFTs available in category |
| `INSUFFICIENT_NFTS` | Not enough NFTs for forging |
| `INVALID_OWNERSHIP` | Player doesn't own required NFTs |
| `BLOCKCHAIN_ERROR` | Blockchain transaction failed |

## Rate Limiting

### WAF Rate Limits

- **Global**: 100 requests per 5 minutes per IP address
- **Burst**: 500 requests

### Application Rate Limits

| Endpoint | Limit |
|----------|-------|
| Session creation | 10 per minute per stake key |
| Mint requests | 5 per minute per stake key |
| Forge requests | 3 per minute per stake key |
| Question flagging | 10 per hour per player |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890
```


## Authentication Endpoints

### POST /auth/connect

Connect a Cardano wallet and receive a JWT token.

**Authentication**: None required

**Request Body**:
```json
{
  "stakeKey": "stake1u9xyz...",
  "signature": "84582aa201276761646472657373...",
  "key": "a4010103272006215820..."
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stakeKey": "stake1u9xyz...",
    "username": "player123",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "isNewUser": false
}
```

**Response** (201 Created) - New User:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stakeKey": "stake1u9xyz...",
    "username": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "isNewUser": true,
  "requiresProfile": true
}
```

**Errors**:
- `400`: Invalid stake key format
- `400`: Invalid signature

---

### POST /auth/profile

Create a player profile (required for first-time users).

**Authentication**: Required

**Request Body**:
```json
{
  "username": "player123",
  "email": "player@example.com"
}
```

**Response** (200 OK):
```json
{
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stakeKey": "stake1u9xyz...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors**:
- `400`: Username already taken
- `400`: Invalid email format
- `400`: Username must be 3-20 characters

---

### GET /auth/me

Get current authenticated player information.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stakeKey": "stake1u9xyz...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "stats": {
      "totalSessions": 45,
      "perfectScores": 12,
      "nftsMinted": 8,
      "nftsForged": 2
    }
  }
}
```

**Errors**:
- `401`: Invalid or expired token


## Session Endpoints

### POST /sessions/start

Start a new trivia session.

**Authentication**: Required (or guest with anonymous ID)

**Request Body**:
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response** (200 OK):
```json
{
  "session": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "categoryName": "Science",
    "status": "active",
    "currentQuestionIndex": 0,
    "totalQuestions": 10,
    "score": 0,
    "startedAt": "2024-01-15T10:30:00Z",
    "questions": [
      {
        "questionId": "750e8400-e29b-41d4-a716-446655440000",
        "text": "What is the chemical symbol for gold?",
        "options": [
          "A: Au",
          "B: Ag",
          "C: Fe",
          "D: Cu"
        ]
      }
      // ... 9 more questions (correctIndex not included)
    ]
  },
  "remainingPlays": 9,
  "cooldownEndsAt": null
}
```

**Errors**:
- `400`: `DAILY_LIMIT_REACHED` - Daily session limit reached
- `400`: `SESSION_ACTIVE` - Player already has an active session
- `400`: `COOLDOWN_ACTIVE` - Cooldown period not expired
- `404`: Category not found

---

### POST /sessions/{sessionId}/answer

Submit an answer for the current question.

**Authentication**: Required

**Path Parameters**:
- `sessionId` (string, UUID): Session identifier

**Request Body**:
```json
{
  "questionIndex": 0,
  "optionIndex": 0,
  "timeMs": 5432
}
```

**Response** (200 OK):
```json
{
  "correct": true,
  "correctIndex": 0,
  "explanation": "Au is the chemical symbol for gold, derived from the Latin word 'aurum'.",
  "score": 1,
  "currentQuestionIndex": 1,
  "isComplete": false
}
```

**Errors**:
- `400`: Invalid question index
- `400`: Question already answered
- `400`: Time exceeded (> 10 seconds)
- `404`: Session not found
- `403`: Session belongs to different player

---

### POST /sessions/{sessionId}/complete

Complete the current session and get final results.

**Authentication**: Required

**Path Parameters**:
- `sessionId` (string, UUID): Session identifier

**Response** (200 OK):
```json
{
  "session": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "status": "won",
    "score": 10,
    "totalQuestions": 10,
    "totalTimeMs": 54320,
    "avgTimeMs": 5432,
    "completedAt": "2024-01-15T10:35:00Z"
  },
  "isPerfect": true,
  "eligibility": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "categoryName": "Science",
    "expiresAt": "2024-01-15T11:35:00Z",
    "status": "active"
  },
  "seasonPoints": {
    "pointsEarned": 20,
    "totalPoints": 145,
    "rank": 42
  }
}
```

**Response** (200 OK) - Not Perfect:
```json
{
  "session": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "status": "won",
    "score": 7,
    "totalQuestions": 10,
    "totalTimeMs": 62100,
    "avgTimeMs": 6210,
    "completedAt": "2024-01-15T10:35:00Z"
  },
  "isPerfect": false,
  "eligibility": null,
  "seasonPoints": {
    "pointsEarned": 7,
    "totalPoints": 132,
    "rank": 48
  }
}
```

**Errors**:
- `400`: Not all questions answered
- `404`: Session not found
- `403`: Session belongs to different player

---

### GET /sessions/history

Get player's session history.

**Authentication**: Required

**Query Parameters**:
- `limit` (integer, optional): Number of sessions to return (default: 20, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440000",
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryName": "Science",
      "status": "won",
      "score": 10,
      "totalQuestions": 10,
      "isPerfect": true,
      "completedAt": "2024-01-15T10:35:00Z"
    }
    // ... more sessions
  ],
  "total": 45,
  "hasMore": true
}
```


## Question Endpoints

### POST /questions/flag

Report a question for review.

**Authentication**: Required

**Request Body**:
```json
{
  "questionId": "750e8400-e29b-41d4-a716-446655440000",
  "reason": "ambiguous",
  "comment": "The question has multiple correct answers"
}
```

**Response** (200 OK):
```json
{
  "flagId": "950e8400-e29b-41d4-a716-446655440000",
  "status": "pending_review",
  "message": "Thank you for your feedback. Our team will review this question."
}
```

**Errors**:
- `404`: Question not found
- `429`: Too many flags (limit: 10 per hour)

---

## Eligibility Endpoints

### GET /eligibilities

Get player's active mint eligibilities.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "eligibilities": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440000",
      "type": "category",
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryName": "Science",
      "status": "active",
      "expiresAt": "2024-01-15T11:35:00Z",
      "expiresInSeconds": 3420,
      "sessionId": "650e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

---

## Mint Endpoints

### POST /mint/{eligibilityId}

Initiate NFT minting for an eligibility.

**Authentication**: Required

**Path Parameters**:
- `eligibilityId` (string, UUID): Eligibility identifier

**Response** (202 Accepted):
```json
{
  "mintOperation": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "eligibilityId": "850e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "createdAt": "2024-01-15T10:40:00Z"
  },
  "message": "Minting initiated. Poll /mint/{mintId}/status for updates."
}
```

**Errors**:
- `404`: Eligibility not found
- `400`: `ELIGIBILITY_EXPIRED` - Eligibility has expired
- `400`: `ELIGIBILITY_USED` - Eligibility already used
- `400`: `NFT_OUT_OF_STOCK` - No NFTs available
- `429`: Rate limit exceeded (5 per minute)

---

### GET /mint/{mintId}/status

Check the status of a mint operation.

**Authentication**: Required

**Path Parameters**:
- `mintId` (string, UUID): Mint operation identifier

**Response** (200 OK) - Pending:
```json
{
  "mintOperation": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "currentStep": "uploading_to_ipfs",
    "createdAt": "2024-01-15T10:40:00Z"
  }
}
```

**Response** (200 OK) - Confirmed:
```json
{
  "mintOperation": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "status": "confirmed",
    "txHash": "8f3e9d2c1b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
    "confirmedAt": "2024-01-15T10:42:30Z",
    "nft": {
      "policyId": "b50e8400e29b41d4a716446655440000",
      "assetFingerprint": "asset1abc123...",
      "tokenName": "TriviaNFT_Science_001",
      "metadata": {
        "name": "Science Trivia NFT #001",
        "image": "ipfs://QmXyz...",
        "attributes": [
          {
            "trait_type": "Category",
            "value": "Science"
          },
          {
            "trait_type": "Rarity",
            "value": "Common"
          }
        ]
      }
    }
  },
  "explorerUrl": "https://cardanoscan.io/transaction/8f3e9d2c..."
}
```

**Response** (200 OK) - Failed:
```json
{
  "mintOperation": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "status": "failed",
    "error": "Blockchain transaction failed",
    "failedAt": "2024-01-15T10:42:00Z"
  }
}
```

**Errors**:
- `404`: Mint operation not found
- `403`: Mint operation belongs to different player


## Forge Endpoints

### GET /forge/progress

Get player's forging progress for all forge types.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "forgeProgress": [
    {
      "type": "category",
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryName": "Science",
      "required": 10,
      "current": 7,
      "canForge": false,
      "nfts": [
        {
          "assetFingerprint": "asset1abc123...",
          "tokenName": "TriviaNFT_Science_001",
          "mintedAt": "2024-01-10T10:30:00Z"
        }
        // ... 6 more NFTs
      ]
    },
    {
      "type": "master",
      "required": 10,
      "current": 8,
      "canForge": false,
      "categoriesCompleted": [
        "Science",
        "History",
        "Geography",
        "Sports",
        "Arts",
        "Entertainment",
        "Technology",
        "Literature"
      ]
    },
    {
      "type": "season",
      "seasonId": "winter-s1",
      "seasonName": "Winter Season 1",
      "required": 18,
      "current": 12,
      "canForge": false,
      "requiresPerCategory": 2,
      "progress": {
        "Science": 2,
        "History": 2,
        "Geography": 2,
        "Sports": 2,
        "Arts": 2,
        "Entertainment": 2,
        "Technology": 0,
        "Literature": 0,
        "General": 0
      }
    }
  ]
}
```

---

### POST /forge/category

Forge a Category Ultimate NFT.

**Authentication**: Required

**Request Body**:
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "inputFingerprints": [
    "asset1abc123...",
    "asset1def456...",
    "asset1ghi789...",
    "asset1jkl012...",
    "asset1mno345...",
    "asset1pqr678...",
    "asset1stu901...",
    "asset1vwx234...",
    "asset1yza567...",
    "asset1bcd890..."
  ]
}
```

**Response** (202 Accepted):
```json
{
  "forgeOperation": {
    "id": "c50e8400-e29b-41d4-a716-446655440000",
    "type": "category",
    "categoryId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "message": "Forging initiated. Poll /forge/{forgeId}/status for updates."
}
```

**Errors**:
- `400`: `INSUFFICIENT_NFTS` - Not enough NFTs provided
- `400`: `INVALID_OWNERSHIP` - Player doesn't own all NFTs
- `400`: Wrong category for provided NFTs
- `429`: Rate limit exceeded (3 per minute)

---

### POST /forge/master

Forge a Master Ultimate NFT.

**Authentication**: Required

**Request Body**:
```json
{
  "inputFingerprints": [
    "asset1abc123...",
    "asset1def456...",
    "asset1ghi789...",
    "asset1jkl012...",
    "asset1mno345...",
    "asset1pqr678...",
    "asset1stu901...",
    "asset1vwx234...",
    "asset1yza567...",
    "asset1bcd890..."
  ]
}
```

**Response** (202 Accepted):
```json
{
  "forgeOperation": {
    "id": "d50e8400-e29b-41d4-a716-446655440000",
    "type": "master",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "message": "Forging initiated. Poll /forge/{forgeId}/status for updates."
}
```

**Errors**:
- `400`: `INSUFFICIENT_NFTS` - Not enough categories represented
- `400`: `INVALID_OWNERSHIP` - Player doesn't own all NFTs
- `429`: Rate limit exceeded (3 per minute)

---

### POST /forge/season

Forge a Seasonal Ultimate NFT.

**Authentication**: Required

**Request Body**:
```json
{
  "seasonId": "winter-s1",
  "inputFingerprints": [
    "asset1abc123...",
    "asset1def456...",
    // ... 16 more (2 per category for 9 categories)
  ]
}
```

**Response** (202 Accepted):
```json
{
  "forgeOperation": {
    "id": "e50e8400-e29b-41d4-a716-446655440000",
    "type": "season",
    "seasonId": "winter-s1",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00Z"
  },
  "message": "Forging initiated. Poll /forge/{forgeId}/status for updates."
}
```

**Errors**:
- `400`: Season not active or grace period expired
- `400`: `INSUFFICIENT_NFTS` - Not enough NFTs per category
- `400`: `INVALID_OWNERSHIP` - Player doesn't own all NFTs
- `429`: Rate limit exceeded (3 per minute)

---

### GET /forge/{forgeId}/status

Check the status of a forge operation.

**Authentication**: Required

**Path Parameters**:
- `forgeId` (string, UUID): Forge operation identifier

**Response** (200 OK) - Pending:
```json
{
  "forgeOperation": {
    "id": "c50e8400-e29b-41d4-a716-446655440000",
    "type": "category",
    "status": "pending",
    "currentStep": "burning_nfts",
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

**Response** (200 OK) - Confirmed:
```json
{
  "forgeOperation": {
    "id": "c50e8400-e29b-41d4-a716-446655440000",
    "type": "category",
    "status": "confirmed",
    "burnTxHash": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
    "mintTxHash": "8f3e9d2c1b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
    "confirmedAt": "2024-01-15T11:05:30Z",
    "ultimateNft": {
      "policyId": "f50e8400e29b41d4a716446655440000",
      "assetFingerprint": "asset1xyz789...",
      "tokenName": "TriviaNFT_Science_Ultimate",
      "metadata": {
        "name": "Science Ultimate Trivia NFT",
        "image": "ipfs://QmAbc...",
        "attributes": [
          {
            "trait_type": "Category",
            "value": "Science"
          },
          {
            "trait_type": "Tier",
            "value": "Ultimate"
          },
          {
            "trait_type": "Rarity",
            "value": "Legendary"
          }
        ]
      }
    }
  },
  "burnExplorerUrl": "https://cardanoscan.io/transaction/1a2b3c4d...",
  "mintExplorerUrl": "https://cardanoscan.io/transaction/8f3e9d2c..."
}
```

**Errors**:
- `404`: Forge operation not found
- `403`: Forge operation belongs to different player


## Leaderboard Endpoints

### GET /leaderboard/global

Get the global leaderboard for the current season.

**Authentication**: Optional (public endpoint)

**Query Parameters**:
- `seasonId` (string, optional): Season identifier (defaults to current season)
- `limit` (integer, optional): Number of entries to return (default: 50, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1",
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-03-31T23:59:59Z"
  },
  "leaderboard": [
    {
      "rank": 1,
      "username": "trivia_master",
      "stakeKey": "stake1u9xyz...",
      "points": 1250,
      "nftsMinted": 45,
      "perfectScores": 38,
      "avgAnswerTimeMs": 4523,
      "sessionsUsed": 120
    },
    {
      "rank": 2,
      "username": "quiz_wizard",
      "stakeKey": "stake1u8abc...",
      "points": 1180,
      "nftsMinted": 42,
      "perfectScores": 35,
      "avgAnswerTimeMs": 4821,
      "sessionsUsed": 115
    }
    // ... more entries
  ],
  "total": 1523,
  "hasMore": true,
  "currentPlayer": {
    "rank": 42,
    "points": 145
  }
}
```

---

### GET /leaderboard/category/{categoryId}

Get the category-specific leaderboard.

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `categoryId` (string, UUID): Category identifier

**Query Parameters**:
- `seasonId` (string, optional): Season identifier (defaults to current season)
- `limit` (integer, optional): Number of entries to return (default: 50, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Science"
  },
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1"
  },
  "leaderboard": [
    {
      "rank": 1,
      "username": "science_pro",
      "stakeKey": "stake1u9xyz...",
      "points": 320,
      "perfectScores": 28,
      "avgAnswerTimeMs": 4123
    }
    // ... more entries
  ],
  "total": 856,
  "hasMore": true
}
```

---

### GET /leaderboard/season/{seasonId}

Get historical season standings.

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `seasonId` (string): Season identifier

**Query Parameters**:
- `limit` (integer, optional): Number of entries to return (default: 50, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1",
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-03-31T23:59:59Z",
    "status": "completed"
  },
  "leaderboard": [
    {
      "rank": 1,
      "username": "season_champion",
      "stakeKey": "stake1u9xyz...",
      "finalPoints": 1850,
      "nftsMinted": 62,
      "perfectScores": 51,
      "prizeAwarded": true
    }
    // ... more entries
  ],
  "total": 2341,
  "hasMore": true
}
```

---

## Profile Endpoints

### GET /profile

Get detailed player profile.

**Authentication**: Required

**Response** (200 OK):
```json
{
  "player": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "stakeKey": "stake1u9xyz...",
    "username": "player123",
    "email": "player@example.com",
    "createdAt": "2024-01-01T10:30:00Z"
  },
  "stats": {
    "totalSessions": 45,
    "wonSessions": 32,
    "lostSessions": 13,
    "perfectScores": 12,
    "nftsMinted": 8,
    "nftsForged": 2,
    "currentStreak": 5,
    "longestStreak": 12
  },
  "dailyStatus": {
    "remainingPlays": 7,
    "resetAt": "2024-01-16T05:00:00Z"
  },
  "currentSeason": {
    "seasonId": "winter-s1",
    "seasonName": "Winter Season 1",
    "points": 145,
    "rank": 42,
    "endsAt": "2024-03-31T23:59:59Z"
  },
  "categoryStats": [
    {
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryName": "Science",
      "perfectScores": 5,
      "nftsMinted": 3,
      "avgScore": 8.2
    }
    // ... more categories
  ]
}
```

---

### GET /profile/nfts

Get player's owned NFTs.

**Authentication**: Required

**Query Parameters**:
- `categoryId` (string, optional): Filter by category
- `tier` (string, optional): Filter by tier (common, ultimate, master, seasonal)
- `limit` (integer, optional): Number of NFTs to return (default: 50, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "nfts": [
    {
      "id": "b50e8400-e29b-41d4-a716-446655440000",
      "policyId": "b50e8400e29b41d4a716446655440000",
      "assetFingerprint": "asset1abc123...",
      "tokenName": "TriviaNFT_Science_001",
      "categoryId": "550e8400-e29b-41d4-a716-446655440001",
      "categoryName": "Science",
      "tier": "common",
      "status": "confirmed",
      "mintedAt": "2024-01-10T10:30:00Z",
      "metadata": {
        "name": "Science Trivia NFT #001",
        "image": "ipfs://QmXyz...",
        "attributes": [
          {
            "trait_type": "Category",
            "value": "Science"
          },
          {
            "trait_type": "Rarity",
            "value": "Common"
          }
        ]
      }
    }
    // ... more NFTs
  ],
  "total": 8,
  "hasMore": false
}
```

---

### GET /profile/activity

Get player's activity history (mints and forges).

**Authentication**: Required

**Query Parameters**:
- `type` (string, optional): Filter by type (mint, forge)
- `limit` (integer, optional): Number of activities to return (default: 20, max: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "activities": [
    {
      "id": "a50e8400-e29b-41d4-a716-446655440000",
      "type": "mint",
      "categoryName": "Science",
      "nftName": "Science Trivia NFT #001",
      "txHash": "8f3e9d2c1b4a5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
      "timestamp": "2024-01-10T10:30:00Z"
    },
    {
      "id": "c50e8400-e29b-41d4-a716-446655440000",
      "type": "forge",
      "forgeType": "category",
      "categoryName": "Science",
      "nftName": "Science Ultimate Trivia NFT",
      "inputCount": 10,
      "burnTxHash": "1a2b3c4d...",
      "mintTxHash": "8f3e9d2c...",
      "timestamp": "2024-01-15T11:05:30Z"
    }
    // ... more activities
  ],
  "total": 10,
  "hasMore": false
}
```

---

## Season Endpoints

### GET /seasons/current

Get current season information.

**Authentication**: Optional (public endpoint)

**Response** (200 OK):
```json
{
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1",
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-03-31T23:59:59Z",
    "graceDays": 7,
    "graceEndsAt": "2024-04-07T23:59:59Z",
    "status": "active",
    "endsInSeconds": 5184000
  },
  "activeCategories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Science",
      "nftsAvailable": 245
    }
    // ... 8 more categories
  ],
  "prize": {
    "description": "Exclusive Season Winner NFT",
    "imageUrl": "https://cdn.trivianft.com/prizes/winter-s1.png"
  }
}
```

---

### GET /seasons

Get all seasons (past and current).

**Authentication**: Optional (public endpoint)

**Response** (200 OK):
```json
{
  "seasons": [
    {
      "id": "winter-s1",
      "name": "Winter Season 1",
      "startsAt": "2024-01-01T00:00:00Z",
      "endsAt": "2024-03-31T23:59:59Z",
      "status": "active"
    },
    {
      "id": "fall-s0",
      "name": "Fall Season 0 (Beta)",
      "startsAt": "2023-10-01T00:00:00Z",
      "endsAt": "2023-12-31T23:59:59Z",
      "status": "completed",
      "winner": {
        "username": "beta_champion",
        "finalPoints": 1523
      }
    }
  ]
}
```

---

## Categories Endpoint

### GET /categories

Get all available trivia categories.

**Authentication**: Optional (public endpoint)

**Response** (200 OK):
```json
{
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Science",
      "description": "Questions about physics, chemistry, biology, and more",
      "icon": "🔬",
      "nftsAvailable": 245,
      "totalQuestions": 1523,
      "isActive": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "History",
      "description": "Questions about world history and historical events",
      "icon": "📜",
      "nftsAvailable": 198,
      "totalQuestions": 1402,
      "isActive": true
    }
    // ... 7 more categories
  ]
}
```

---

## OpenAPI Specification

A complete OpenAPI 3.0 specification is available at:

**URL**: `https://api.trivianft.com/openapi.json`

You can use this specification with tools like Swagger UI, Postman, or code generators.

---

## SDK and Code Examples

### JavaScript/TypeScript

```typescript
import { TriviaNFTClient } from '@trivianft/sdk';

const client = new TriviaNFTClient({
  apiUrl: 'https://api.trivianft.com',
  token: 'your-jwt-token'
});

// Start a session
const session = await client.sessions.start({
  categoryId: 'science-category-id'
});

// Submit an answer
const result = await client.sessions.submitAnswer(session.id, {
  questionIndex: 0,
  optionIndex: 0,
  timeMs: 5432
});

// Complete session
const finalResult = await client.sessions.complete(session.id);
```

### Python

```python
from trivianft import TriviaNFTClient

client = TriviaNFTClient(
    api_url='https://api.trivianft.com',
    token='your-jwt-token'
)

# Start a session
session = client.sessions.start(category_id='science-category-id')

# Submit an answer
result = client.sessions.submit_answer(
    session_id=session['id'],
    question_index=0,
    option_index=0,
    time_ms=5432
)

# Complete session
final_result = client.sessions.complete(session_id=session['id'])
```

---

## Webhooks (Future)

Webhook support for real-time notifications is planned for a future release. This will include:

- Session completion events
- Mint confirmation events
- Forge completion events
- Leaderboard rank changes

---

## Support

For API support, please contact:
- Email: api-support@trivianft.com
- Discord: https://discord.gg/trivianft
- Documentation: https://docs.trivianft.com

