# Session Handlers

Lambda handlers for session management endpoints.

## Endpoints

### POST /sessions/start

Start a new trivia session.

**Request:**
```json
{
  "categoryId": "uuid"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "playerId": "uuid",
    "stakeKey": "stake1...",
    "categoryId": "uuid",
    "status": "active",
    "currentQuestionIndex": 0,
    "questions": [
      {
        "questionId": "uuid",
        "text": "What is the capital of France?",
        "options": ["London", "Paris", "Berlin", "Madrid"],
        "servedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "score": 0,
    "startedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Codes:**
- `DAILY_LIMIT_REACHED` (429): Player has reached daily session limit
- `COOLDOWN_ACTIVE` (429): Session cooldown is active
- `ACTIVE_SESSION_EXISTS` (409): Player already has an active session
- `INSUFFICIENT_QUESTIONS` (400): Not enough questions available for category

### POST /sessions/{id}/answer

Submit an answer for a question in an active session.

**Request:**
```json
{
  "questionIndex": 0,
  "optionIndex": 1,
  "timeMs": 5000
}
```

**Response:**
```json
{
  "correct": true,
  "correctIndex": 1,
  "explanation": "Paris is the capital and largest city of France.",
  "score": 1
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` (404): Session does not exist or has expired
- `INVALID_QUESTION_INDEX` (400): Question index does not match current question
- `QUESTION_OUT_OF_BOUNDS` (400): Question index is out of range
- `ANSWER_TIMEOUT` (400): Answer submitted after 10 second timeout

### POST /sessions/{id}/complete

Complete an active session and get final results.

**Response:**
```json
{
  "result": {
    "score": 10,
    "totalQuestions": 10,
    "isPerfect": true,
    "eligibilityId": "uuid",
    "status": "won",
    "totalMs": 95000
  }
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` (404): Session does not exist or has expired

### GET /sessions/history

Get session history for the authenticated player.

**Query Parameters:**
- `limit` (optional): Number of sessions to return (1-100, default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "playerId": "uuid",
      "stakeKey": "stake1...",
      "categoryId": "uuid",
      "status": "won",
      "score": 8,
      "startedAt": "2024-01-01T00:00:00Z",
      "endedAt": "2024-01-01T00:02:00Z",
      "totalMs": 120000
    }
  ],
  "total": 50,
  "hasMore": true
}
```

**Error Codes:**
- `INVALID_LIMIT` (400): Limit is not between 1 and 100
- `INVALID_OFFSET` (400): Offset is negative

## Implementation Details

### Session Flow

1. **Start Session**
   - Check daily limit in Redis
   - Check cooldown in Redis
   - Acquire session lock
   - Select 10 questions (avoiding seen questions)
   - Store session state in Redis with 15 minute TTL
   - Return session with questions (no correct answers)

2. **Submit Answer**
   - Retrieve session from Redis
   - Validate question index and timing
   - Compare answer with correct index
   - Update score and session state
   - Add question to seen set
   - Return result with correct answer and explanation

3. **Complete Session**
   - Calculate final score and timing
   - Determine win/loss status (6+ correct = win)
   - If perfect (10/10), create eligibility in Aurora
   - Update season points in Redis leaderboard
   - Persist completed session to Aurora
   - Release session lock
   - Set cooldown (60 seconds)
   - Increment daily session count
   - Delete session from Redis

### Redis Keys

- `session:{sessionId}` - Session state (Hash, 15 min TTL)
- `lock:session:{identifier}` - Session lock (String, 15 min TTL)
- `limit:daily:{identifier}:{date}` - Daily session count (Integer, 24 hour TTL)
- `cooldown:{identifier}` - Cooldown timestamp (String, 60 sec TTL)
- `seen:{identifier}:{categoryId}:{date}` - Seen question IDs (Set, 24 hour TTL)
- `ladder:global:{seasonId}` - Global leaderboard (Sorted Set, no TTL)

### Database Tables

- `sessions` - Completed sessions
- `eligibilities` - Mint eligibilities for perfect scores
- `season_points` - Season points and statistics

## Requirements Covered

- **Requirement 1**: Session Management - 10 questions, 10s timer, no pauses
- **Requirement 2**: Session Concurrency Control - One active session per player
- **Requirement 3**: Daily Session Limits - 10 for connected, 5 for guest
- **Requirement 4**: Session Cooldown - 60 seconds between sessions
- **Requirement 6**: Category Selection - Player selects category
- **Requirement 8**: Question Rotation - Avoid repeating questions same day
- **Requirement 10**: Perfect Score Mint Eligibility - Create eligibility for 10/10
- **Requirement 20**: Win/Loss Determination - 6+ correct = win
- **Requirement 21**: Season Points Calculation - 1 per correct + 10 bonus for perfect
- **Requirement 30**: Activity Log - Session history endpoint
- **Requirement 33**: Player Messaging - Timeout handling
- **Requirement 34**: Player Messaging - Perfect score notification
