# Leaderboard Handlers

This directory contains Lambda handlers for leaderboard functionality in the TriviaNFT platform.

## Overview

The leaderboard system tracks player rankings across seasons and categories using a composite scoring system with multiple tie-breakers. It uses Redis sorted sets for real-time rankings and Aurora PostgreSQL for persistent storage and historical data.

## Handlers

### GET /leaderboard/global

Get the global leaderboard for the current or specified season.

**Query Parameters:**
- `seasonId` (optional): Season ID to query. Defaults to current active season.
- `limit` (optional): Number of entries to return (1-100). Default: 20.
- `offset` (optional): Pagination offset. Default: 0.

**Response:**
```json
{
  "seasonId": "winter-s1",
  "entries": [
    {
      "rank": 1,
      "stakeKey": "stake1...",
      "username": "player123",
      "points": 150,
      "nftsMinted": 5,
      "perfectScores": 10,
      "avgAnswerTime": 5234.5,
      "sessionsUsed": 15,
      "firstAchievedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1000,
  "hasMore": true
}
```

### GET /leaderboard/category/{id}

Get the category-specific leaderboard for the current or specified season.

**Path Parameters:**
- `id`: Category ID

**Query Parameters:**
- `seasonId` (optional): Season ID to query. Defaults to current active season.
- `limit` (optional): Number of entries to return (1-100). Default: 20.
- `offset` (optional): Pagination offset. Default: 0.

**Response:**
```json
{
  "categoryId": "science",
  "seasonId": "winter-s1",
  "entries": [
    {
      "rank": 1,
      "stakeKey": "stake1...",
      "username": "player123",
      "points": 50,
      "nftsMinted": 0,
      "perfectScores": 3,
      "avgAnswerTime": 4567.8,
      "sessionsUsed": 5,
      "firstAchievedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 500,
  "hasMore": true
}
```

### GET /leaderboard/season/{id}

Get season standings (historical or current) with prize information for completed seasons.

**Path Parameters:**
- `id`: Season ID

**Query Parameters:**
- `limit` (optional): Number of entries to return (1-100). Default: 20.
- `offset` (optional): Pagination offset. Default: 0.

**Response:**
```json
{
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1",
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-03-31T23:59:59Z",
    "graceDays": 7,
    "isActive": false,
    "isCompleted": true
  },
  "entries": [
    {
      "rank": 1,
      "stakeKey": "stake1...",
      "username": "player123",
      "points": 500,
      "nftsMinted": 20,
      "perfectScores": 40,
      "avgAnswerTime": 5000.0,
      "sessionsUsed": 50,
      "firstAchievedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1000,
  "hasMore": true,
  "prize": {
    "winner": {
      "stakeKey": "stake1...",
      "username": "player123",
      "points": 500
    },
    "prizeAwarded": true
  }
}
```

## Composite Scoring System

The leaderboard uses a composite score to rank players with multiple tie-breakers:

```
score = (points * 1e15) + 
        (nftsMinted * 1e12) + 
        (perfectScores * 1e9) + 
        ((1e9 - avgAnswerTime) * 1e6) + 
        ((1e6 - sessionsUsed) * 1e3) + 
        (timestamp % 1e3)
```

### Tie-Breaker Priority

1. **Points**: Total points earned (1 per correct answer + 10 bonus for perfect scores)
2. **NFTs Minted**: Number of NFTs minted this season
3. **Perfect Scores**: Number of perfect scores (10/10) achieved
4. **Average Answer Time**: Lower is better (faster answers)
5. **Sessions Used**: Fewer sessions is better (efficiency)
6. **First Achieved**: Earlier timestamp wins

## Data Storage

### Redis (Real-time Rankings)

**Global Leaderboard:**
```
Key: ladder:global:{seasonId}
Type: Sorted Set
Members: stake keys
Scores: composite scores
```

**Category Leaderboard:**
```
Key: ladder:category:{categoryId}:{seasonId}
Type: Sorted Set
Members: stake keys
Scores: composite scores
```

### Aurora (Persistent Storage)

**season_points table:**
- Stores cumulative points and metadata for each player per season
- Updated after each session completion
- Used to reconstruct leaderboards and for historical queries

**leaderboard_snapshots table:**
- Daily snapshots of leaderboard state
- Used for historical season standings
- Created by EventBridge scheduled Lambda

## Integration

The leaderboard is automatically updated by the `SessionService` when a session is completed:

```typescript
// In SessionService.completeSession()
if (sessionData.stakeKey) {
  await this.leaderboardService.updatePlayerPoints(
    sessionData.stakeKey,
    seasonId,
    points,
    {
      perfectScores: isPerfect ? 1 : 0,
      avgAnswerTime: avgTimePerQuestion,
      sessionsUsed: 1,
      nftsMinted: 0,
      firstAchievedAt: startedAt,
    }
  );

  await this.leaderboardService.updateCategoryLeaderboard(
    sessionData.stakeKey,
    sessionData.categoryId,
    seasonId,
    points,
    metadata
  );
}
```

## Error Handling

All handlers include comprehensive error handling:
- 400: Invalid parameters (limit, offset, category not found)
- 404: Season or category not found
- 500: Internal server errors with detailed error messages

## Performance Considerations

1. **Redis for Speed**: Real-time rankings use Redis sorted sets for O(log N) operations
2. **Pagination**: All endpoints support pagination to handle large leaderboards
3. **Caching**: Consider adding API Gateway caching with 1-minute TTL
4. **Indexes**: Aurora queries use indexes on season_id, stake_key, and rank

## Future Enhancements

1. Add player's own rank in response (even if not in current page)
2. Support filtering by username search
3. Add category-specific perfect score tracking
4. Implement real-time WebSocket updates for live leaderboard changes
5. Add leaderboard change notifications (rank up/down)
