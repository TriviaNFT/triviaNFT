# Season Handlers

This directory contains Lambda handlers for season management functionality.

## Endpoints

### GET /seasons/current

Returns information about the current active season.

**Response:**
```json
{
  "season": {
    "id": "winter-s1",
    "name": "Winter Season 1",
    "startsAt": "2024-01-01T05:00:00.000Z",
    "endsAt": "2024-04-01T05:00:00.000Z",
    "graceDays": 7,
    "isActive": true,
    "isWithinGracePeriod": false,
    "graceEndsAt": "2024-04-08T05:00:00.000Z",
    "countdown": {
      "days": 45,
      "hours": 12,
      "minutes": 30,
      "totalMs": 3931800000
    }
  },
  "activeCategories": [
    {
      "id": "uuid",
      "name": "Science",
      "slug": "science",
      "description": "Questions about physics, chemistry, biology, and astronomy",
      "iconUrl": null
    }
    // ... more categories
  ]
}
```

**Requirements:** 19, 27, 28

## Scheduled Tasks

### Season Transition

Triggered by EventBridge on a quarterly schedule (Jan 1, Apr 1, Jul 1, Oct 1 at midnight ET).

**Functionality:**
1. Archives current season leaderboard to `leaderboard_snapshots`
2. Awards prize to top player on global ladder
3. Deactivates current season
4. Creates and activates new season
5. Initializes `season_points` records for all active players
6. Resets seasonal points in Redis

**Requirements:** 19, 24, 26

## Implementation Notes

### Season Lifecycle

1. **Active Season**: One season is active at a time (`is_active = true`)
2. **Season Duration**: Default 3 months
3. **Grace Period**: 7 days after season end for seasonal forging
4. **Transition**: Automatic via EventBridge rule

### Season Naming Convention

Seasons follow a cyclical naming pattern:
- Winter Season N
- Spring Season N
- Summer Season N
- Fall Season N
- Winter Season N+1

Season IDs follow the format: `{season}-s{number}` (e.g., `winter-s1`, `spring-s1`, `summer-s1`, `fall-s1`, `winter-s2`)

### Prize Distribution

The top player on the global leaderboard at season end receives a special prize NFT. Eligibility criteria:
- Must have a connected wallet (stake key)
- Must have a username
- Must be in good standing (Fair Play policy)

### Leaderboard Archival

Daily snapshots are taken at 1 AM ET and stored in `leaderboard_snapshots`. The final snapshot at season end serves as the official season standings.

## Database Schema

### seasons table
```sql
CREATE TABLE seasons (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  grace_days SMALLINT NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### season_points table
```sql
CREATE TABLE season_points (
  season_id VARCHAR(50) NOT NULL REFERENCES seasons(id),
  stake_key VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  perfect_scores INTEGER NOT NULL DEFAULT 0,
  nfts_minted INTEGER NOT NULL DEFAULT 0,
  avg_answer_ms INTEGER NOT NULL DEFAULT 0,
  sessions_used INTEGER NOT NULL DEFAULT 0,
  first_achieved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, stake_key)
);
```

### leaderboard_snapshots table
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id VARCHAR(50) NOT NULL REFERENCES seasons(id),
  snapshot_date DATE NOT NULL,
  stake_key VARCHAR(255) NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  nfts_minted INTEGER NOT NULL,
  perfect_scores INTEGER NOT NULL,
  avg_answer_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Testing

### Manual Testing

To test the season transition manually:

```bash
# Invoke the Lambda function directly
aws lambda invoke \
  --function-name trivia-nft-season-transition \
  --payload '{"detail":{"newSeasonId":"spring-s1","newSeasonName":"Spring Season 1"}}' \
  response.json
```

### Integration Testing

```typescript
describe('Season Management', () => {
  it('should return current season info', async () => {
    const response = await request(app).get('/seasons/current');
    
    expect(response.status).toBe(200);
    expect(response.body.season).toBeDefined();
    expect(response.body.season.id).toBe('winter-s1');
    expect(response.body.activeCategories).toBeInstanceOf(Array);
  });

  it('should calculate countdown correctly', async () => {
    const response = await request(app).get('/seasons/current');
    
    expect(response.body.season.countdown).toBeDefined();
    expect(response.body.season.countdown.days).toBeGreaterThanOrEqual(0);
    expect(response.body.season.countdown.totalMs).toBeGreaterThanOrEqual(0);
  });
});
```

## Monitoring

### CloudWatch Metrics

- Season transition success/failure
- Number of players initialized per season
- Leaderboard snapshot size
- Prize distribution success

### Alarms

- Season transition failures
- Missing leaderboard snapshots
- Prize distribution failures

## Future Enhancements

1. **Custom Season Durations**: Allow configurable season lengths via AppConfig
2. **Multiple Prize Tiers**: Award prizes to top 3 players
3. **Season Themes**: Associate specific categories or NFT designs with seasons
4. **Mid-Season Events**: Special events or bonuses during active seasons
5. **Season Preview**: Show upcoming season details before transition
