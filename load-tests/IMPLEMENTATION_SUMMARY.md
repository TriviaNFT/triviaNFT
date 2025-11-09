# Load Testing Implementation Summary

## Overview

This document summarizes the implementation of **Task 33.1: Set up load testing tool (Artillery or k6)** for the TriviaNFT platform, validating **Requirement 47: Observability - Metrics**.

## Implementation Details

### Tool Selection: k6

We selected **k6** as the load testing tool for the following reasons:

1. **Performance**: Written in Go, handles high concurrency efficiently
2. **Scripting**: JavaScript/ES6 support for easy test creation
3. **Metrics**: Built-in support for p50, p95, p99 latency metrics (Requirement 47)
4. **Thresholds**: Define pass/fail criteria directly in tests
5. **Output Formats**: JSON, InfluxDB, CSV for analysis
6. **Community**: Active community and extensive documentation

### Project Structure

```
load-tests/
├── package.json              # Project configuration and scripts
├── README.md                 # Quick start guide
├── ANALYSIS_GUIDE.md         # Detailed analysis documentation
├── IMPLEMENTATION_SUMMARY.md # This file
├── config.js                 # Centralized test configuration
├── .env.example              # Environment variable template
├── .gitignore               # Git ignore rules
├── scenarios/               # Test scenarios
│   ├── sessions.js          # Session creation and management
│   ├── answers.js           # Answer submission under load
│   ├── leaderboard.js       # Leaderboard query performance
│   └── full-load.js         # Combined realistic traffic
├── scripts/                 # Helper scripts
│   ├── run-tests.sh         # Test execution wrapper
│   └── analyze-results.sh   # Results analysis tool
└── results/                 # Test results (gitignored)
    ├── *.json               # Raw k6 output
    ├── *.txt                # Console output
    └── *.html               # HTML reports
```

### Test Scenarios

#### 1. Session Load Test (`sessions.js`)

**Purpose**: Tests concurrent session creation and management

**Key Metrics**:
- Session creation success rate (target: > 95%)
- Session duration (target: < 15s)
- API latency for session endpoints

**Flow**:
1. Create session with random category
2. Answer 10 questions with realistic timing
3. Complete session
4. Measure end-to-end duration

**Load Profile**: 50 concurrent users for 5 minutes

#### 2. Answer Submission Test (`answers.js`)

**Purpose**: Tests answer submission under high concurrency

**Key Metrics**:
- Answer submission success rate (target: > 98%)
- Answer endpoint latency (p95 < 300ms, p99 < 500ms)
- Total answers submitted

**Flow**:
1. Create session
2. Rapid-fire answer submissions (minimal delay)
3. Complete session

**Load Profile**: 1000 concurrent users for 10 minutes (stress test)

#### 3. Leaderboard Query Test (`leaderboard.js`)

**Purpose**: Tests leaderboard queries with high concurrency

**Key Metrics**:
- Leaderboard query success rate (target: > 99%)
- Query latency (p95 < 400ms, p99 < 800ms)
- Pagination performance

**Flow**:
1. Query global leaderboard
2. Query category leaderboard
3. Paginate through results
4. Query season leaderboard

**Load Profile**: 1000 concurrent users for 10 minutes

#### 4. Full Load Test (`full-load.js`)

**Purpose**: Simulates realistic mixed traffic

**Key Metrics** (Requirement 47):
- Overall API latency (p50, p95, p99)
- Session completion rate
- Mint success rate
- Active concurrent sessions
- Error rate

**Traffic Mix**:
- 50% guest users (complete sessions)
- 35% connected users (sessions + potential mints)
- 15% leaderboard browsers

**Load Profile**: Ramps from 0 to 1000 users over 12 minutes

### Configuration

#### Centralized Config (`config.js`)

```javascript
{
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  
  thresholds: {
    'http_req_duration{endpoint:sessions}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:answers}': ['p(95)<300', 'p(99)<500'],
    'http_req_duration{endpoint:leaderboard}': ['p(95)<400', 'p(99)<800'],
    'http_req_failed': ['rate<0.01'],
    'session_creation_success': ['rate>0.95'],
  },
  
  stages: {
    smoke: [{ duration: '30s', target: 1 }],
    load: [
      { duration: '1m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    stress: [
      { duration: '2m', target: 100 },
      { duration: '2m', target: 500 },
      { duration: '3m', target: 1000 },
      { duration: '3m', target: 1000 },
      { duration: '2m', target: 0 },
    ],
  },
}
```

#### Environment Variables

```bash
API_BASE_URL=http://localhost:3000  # API endpoint
K6_VUS=100                          # Virtual users (optional)
K6_DURATION=5m                      # Test duration (optional)
```

### Custom Metrics (Requirement 47)

All scenarios track custom metrics aligned with Requirement 47:

1. **API Latency**:
   - `http_req_duration` with endpoint tags
   - Percentiles: p50, p95, p99

2. **Session Metrics**:
   - `session_creation_success`: Rate of successful session starts
   - `session_completion_rate`: Rate of completed sessions
   - `active_concurrent_sessions`: Peak concurrent sessions
   - `session_duration`: End-to-end session time

3. **Answer Metrics**:
   - `answer_submission_success`: Rate of successful answers
   - `total_answers_submitted`: Total answer count

4. **Leaderboard Metrics**:
   - `leaderboard_query_success`: Rate of successful queries
   - `total_leaderboard_queries`: Total query count

5. **Mint Metrics**:
   - `mint_success_rate`: Rate of successful mint initiations

### Helper Scripts

#### `run-tests.sh`

Wrapper script for running tests with proper configuration:

```bash
# Smoke test (quick validation)
./scripts/run-tests.sh --type smoke

# Load test (normal traffic)
./scripts/run-tests.sh --type load

# Stress test (1000 users)
./scripts/run-tests.sh --type stress

# Custom test
./scripts/run-tests.sh --scenario sessions --vus 500 --duration 5m

# Test against staging
./scripts/run-tests.sh --url https://api-staging.example.com --type load
```

Features:
- Validates k6 installation
- Checks API health before testing
- Saves results with timestamps
- Provides colored output

#### `analyze-results.sh`

Analyzes test results and generates reports:

```bash
# Analyze most recent result
./scripts/analyze-results.sh

# Analyze specific result
./scripts/analyze-results.sh results/stress_20250108_143022.json
```

Features:
- Extracts key metrics
- Validates against thresholds
- Color-coded pass/fail indicators
- Identifies performance issues

### NPM Scripts

Convenient commands in `package.json`:

```bash
# Individual scenarios
pnpm test:sessions      # Session load test
pnpm test:answers       # Answer submission test
pnpm test:leaderboard   # Leaderboard query test
pnpm test:all          # Full load test

# Quick tests
pnpm test:smoke        # 1 user, 30s
pnpm test:stress       # 1000 users, 5m
```

## Requirement 47 Validation

This implementation validates **Requirement 47: Observability - Metrics**:

### ✅ Acceptance Criteria Met

1. **API Latency (p50, p95, p99)**:
   - All scenarios measure and report percentile latencies
   - Thresholds defined: p95 < 500ms, p99 < 1000ms
   - Tagged by endpoint for granular analysis

2. **Session Completion Rate**:
   - Tracked via `session_completion_rate` metric
   - Threshold: > 95% success rate
   - Measured in full-load scenario

3. **Mint Success Rate**:
   - Tracked via `mint_success_rate` metric
   - Measured when eligibilities are earned
   - Included in full-load scenario

4. **Active Concurrent Sessions**:
   - Tracked via `active_concurrent_sessions` counter
   - Incremented on session start
   - Decremented on session complete
   - Reports peak concurrency

5. **CloudWatch Dashboard Metrics**:
   - Test results provide baseline for dashboard configuration
   - Metrics align with CloudWatch metric names
   - Can be used to validate monitoring setup

## Usage Guide

### Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6
   
   # Windows
   choco install k6
   
   # Linux
   # See https://k6.io/docs/get-started/installation/
   ```

2. Set API endpoint:
   ```bash
   export API_BASE_URL=http://localhost:3000
   ```

### Running Tests

#### Quick Start

```bash
cd load-tests

# Smoke test (validate setup)
pnpm test:smoke

# Full load test
pnpm test:all
```

#### Using Helper Script

```bash
# Smoke test
./scripts/run-tests.sh --type smoke

# Stress test with 1000 users
./scripts/run-tests.sh --type stress

# Custom configuration
./scripts/run-tests.sh \
  --scenario sessions \
  --vus 500 \
  --duration 5m \
  --url https://api-staging.example.com
```

#### Direct k6 Execution

```bash
# Basic test
k6 run scenarios/sessions.js

# With custom VUs and duration
k6 run --vus 100 --duration 5m scenarios/full-load.js

# With JSON output
k6 run --out json=results/output.json scenarios/full-load.js
```

### Analyzing Results

#### Console Output

Results are displayed in console with:
- Total requests and request rate
- API latency percentiles
- Success rates
- Error rates
- Threshold pass/fail status

#### Using Analysis Script

```bash
# Analyze most recent result
./scripts/analyze-results.sh

# Analyze specific result
./scripts/analyze-results.sh results/stress_20250108_143022.json
```

#### Manual Analysis

```bash
# View JSON results
cat results/full-load-summary.json | jq '.metrics.http_req_duration'

# Extract specific metric
cat results/full-load-summary.json | jq '.metrics.http_req_duration.values["p(95)"]'

# View HTML report
open results/full-load-summary.html
```

### Interpreting Results

See `ANALYSIS_GUIDE.md` for detailed guidance on:
- Understanding metrics
- Identifying bottlenecks
- Optimizing performance
- Setting up monitoring

## Next Steps (Task 33.2)

With the load testing tool set up, the next task is to:

1. **Execute Load Tests**:
   - Run stress test with 1000 concurrent users
   - Collect comprehensive metrics

2. **Measure Performance**:
   - API response times (p50, p95, p99)
   - Database query latency
   - Redis operation latency

3. **Identify Bottlenecks**:
   - Analyze results using ANALYSIS_GUIDE.md
   - Identify slow endpoints
   - Find resource constraints

4. **Optimize**:
   - Apply optimizations based on findings
   - Re-run tests to validate improvements
   - Document performance gains

## Files Created

- ✅ `load-tests/package.json` - Project configuration
- ✅ `load-tests/README.md` - Quick start guide
- ✅ `load-tests/ANALYSIS_GUIDE.md` - Analysis documentation
- ✅ `load-tests/IMPLEMENTATION_SUMMARY.md` - This file
- ✅ `load-tests/config.js` - Centralized configuration
- ✅ `load-tests/.env.example` - Environment template
- ✅ `load-tests/.gitignore` - Git ignore rules
- ✅ `load-tests/scenarios/sessions.js` - Session load test
- ✅ `load-tests/scenarios/answers.js` - Answer submission test
- ✅ `load-tests/scenarios/leaderboard.js` - Leaderboard query test
- ✅ `load-tests/scenarios/full-load.js` - Full load test
- ✅ `load-tests/scripts/run-tests.sh` - Test runner script
- ✅ `load-tests/scripts/analyze-results.sh` - Analysis script

## Conclusion

Task 33.1 is complete. The load testing infrastructure is ready to:
- Test API performance under load
- Measure metrics required by Requirement 47
- Identify performance bottlenecks
- Validate system scalability

The implementation provides:
- 4 comprehensive test scenarios
- Automated test execution
- Result analysis tools
- Detailed documentation

Ready to proceed with Task 33.2: Execute load tests and analyze results.
