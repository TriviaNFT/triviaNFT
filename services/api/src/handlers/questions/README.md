# Question Handlers

This directory contains Lambda handlers for question generation, indexing, selection, and flagging.

## Handlers

### 1. Generate Questions (`generate.ts`)
**Endpoint:** `POST /questions/generate`

Generates trivia questions using AWS Bedrock (Claude model) and uploads them to S3.

**Request:**
```json
{
  "categoryId": "uuid",
  "count": 10
}
```

**Response:**
```json
{
  "success": true,
  "categoryId": "uuid",
  "categoryName": "Science",
  "questionsGenerated": 10,
  "message": "Questions generated and uploaded to S3..."
}
```

**Requirements:** 7, 36

---

### 2. Index Questions (`index-questions.ts`)
**Endpoint:** `POST /questions/index-questions`

Reads questions from S3 and indexes them in Aurora database, checking for duplicates using SHA256 hash.

**Request:**
```json
{
  "s3Key": "science/1234567890.json"
}
```

**Response:**
```json
{
  "success": true,
  "s3Key": "science/1234567890.json",
  "questionsRead": 10,
  "inserted": 8,
  "duplicates": 2,
  "poolCount": 1050,
  "message": "Successfully indexed 8 questions (2 duplicates skipped)"
}
```

**Requirements:** 7, 50

---

### 3. Select Questions (`select.ts`)
**Endpoint:** `POST /questions/select`

Selects questions for a session based on pool size and player's seen questions (tracked in Redis).

**Features:**
- Filters out questions seen by player today
- Applies reused/new ratio when pool size >= 1000
- Returns questions WITHOUT correct answers (for client)
- Shuffles questions randomly

**Request:**
```json
{
  "categoryId": "uuid",
  "playerId": "uuid",
  "stakeKey": "stake1...",
  "count": 10
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "text": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"]
    }
  ],
  "poolSize": 1050,
  "reusedCount": 5,
  "newCount": 5
}
```

**Requirements:** 7, 8, 36

---

### 4. Flag Question (`flag.ts`)
**Endpoint:** `POST /questions/flag`

Allows authenticated players to report issues with questions.

**Request:**
```json
{
  "questionId": "uuid",
  "reason": "The answer is incorrect because..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question flagged for review. Thank you for helping improve the game!"
}
```

**Requirements:** 9

---

## Services

### QuestionService (`services/question-service.ts`)

Core service for question management:

- `generateQuestions()` - Generate questions using Bedrock
- `uploadQuestionsToS3()` - Upload questions to S3
- `readQuestionsFromS3()` - Read questions from S3
- `indexQuestions()` - Index questions in database with deduplication
- `getQuestionPoolCount()` - Get question count for category
- `selectQuestionsForSession()` - Select questions with filtering
- `flagQuestion()` - Flag question for review
- `calculateHash()` - Calculate SHA256 hash for deduplication

### RedisService (`services/redis-service.ts`)

Redis operations for session state and caching:

- `getSeenQuestions()` - Get seen question IDs for player/category/date
- `addSeenQuestions()` - Add question IDs to seen set (24h TTL)
- `get()`, `set()`, `del()` - Basic key-value operations
- `hGet()`, `hSet()`, `hGetAll()` - Hash operations
- `incr()`, `exists()` - Utility operations
- `healthCheck()` - Redis health check

---

## Environment Variables

### Required
- `QUESTIONS_BUCKET` - S3 bucket for question storage
- `BEDROCK_MODEL_ID` - Bedrock model ID (default: claude-3-sonnet)
- `DATABASE_URL` or `DATABASE_SECRET_ARN` - Database connection
- `REDIS_URL` or `REDIS_SECRET_ARN` - Redis connection
- `JWT_SECRET` or `JWT_SECRET_ARN` - JWT signing secret

### Optional (AppConfig)
- `QUESTIONS_REUSED_RATIO` - Ratio of reused questions (default: 0.5)
- `QUESTIONS_POOL_THRESHOLD` - Pool size threshold (default: 1000)

---

## Database Schema

### questions table
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index SMALLINT NOT NULL,
  explanation TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'bedrock',
  hash VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### question_flags table
```sql
CREATE TABLE question_flags (
  id UUID PRIMARY KEY,
  question_id UUID NOT NULL,
  player_id UUID NOT NULL,
  reason TEXT,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Redis Keys

### Seen Questions
```
Key: seen:{stakeKey|playerId}:{categoryId}:{date}
Type: Set
TTL: 24 hours
Members: [questionId1, questionId2, ...]
```

---

## Testing

Run type checking:
```bash
pnpm type-check
```

Run tests:
```bash
pnpm test
```

---

## Notes

- Questions are generated in batches and stored in S3 before indexing
- SHA256 hash prevents duplicate questions in database
- Correct answers are never sent to client (only stored server-side)
- Seen questions are tracked per player/category/day in Redis
- Pool size determines whether to use reused/new question ratio
