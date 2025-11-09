# Load Testing Suite

This directory contains load testing scenarios for the TriviaNFT API using k6.

## Prerequisites

Install k6:
- **macOS**: `brew install k6`
- **Windows**: `choco install k6` or download from https://k6.io/docs/get-started/installation/
- **Linux**: See https://k6.io/docs/get-started/installation/

## Configuration

Set the API endpoint in your environment:

```bash
export API_BASE_URL=https://api.trivia-nft.example.com
# or for local testing
export API_BASE_URL=http://localhost:3000
```

## Test Scenarios

### 1. Session Load Test
Tests concurrent session creation and management:
```bash
pnpm test:sessions
```

### 2. Answer Submission Test
Tests answer submission under load:
```bash
pnpm test:answers
```

### 3. Leaderboard Query Test
Tests leaderboard queries with high concurrency:
```bash
pnpm test:leaderboard
```

### 4. Full Load Test
Runs all scenarios together:
```bash
pnpm test:all
```

## Test Profiles

### Smoke Test (Quick validation)
```bash
pnpm test:smoke
```
- 1 virtual user
- 30 seconds duration
- Validates basic functionality

### Stress Test (1000 concurrent users)
```bash
pnpm test:stress
```
- 1000 virtual users
- 5 minutes duration
- Tests system under heavy load

### Custom Test
```bash
k6 run --vus 500 --duration 2m scenarios/sessions.js
```

## Metrics

k6 provides the following metrics:
- **http_req_duration**: Request latency (p50, p95, p99)
- **http_req_failed**: Failed request rate
- **http_reqs**: Total requests per second
- **vus**: Active virtual users
- **iterations**: Completed test iterations

## Results

Results are output to console by default. For detailed analysis:

```bash
# Output to JSON
k6 run --out json=results.json scenarios/full-load.js

# Output to InfluxDB (if configured)
k6 run --out influxdb=http://localhost:8086/k6 scenarios/full-load.js
```

## Thresholds

Tests are configured with the following thresholds:
- API latency p95 < 500ms
- API latency p99 < 1000ms
- Error rate < 1%
- Session creation success rate > 95%

## Requirements

This test suite validates **Requirement 47**: Observability - Metrics
- Measures API latency (p50, p95, p99)
- Measures session completion rate
- Measures concurrent session handling
- Identifies performance bottlenecks
