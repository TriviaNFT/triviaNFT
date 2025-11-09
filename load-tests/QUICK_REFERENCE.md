# Load Testing Quick Reference

## Installation

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
# See https://k6.io/docs/get-started/installation/
```

## Quick Start

```bash
cd load-tests

# 1. Set API endpoint
export API_BASE_URL=http://localhost:3000

# 2. Run smoke test (validate setup)
pnpm test:smoke

# 3. Run full load test
pnpm test:all
```

## Common Commands

### Run Tests

```bash
# Smoke test (1 user, 30s)
./scripts/run-tests.sh --type smoke

# Load test (50 users, 5m)
./scripts/run-tests.sh --type load

# Stress test (1000 users, 12m)
./scripts/run-tests.sh --type stress

# Specific scenario
pnpm test:sessions      # Session load
pnpm test:answers       # Answer submission
pnpm test:leaderboard   # Leaderboard queries
```

### Analyze Results

```bash
# Analyze most recent result
./scripts/analyze-results.sh

# Analyze specific result
./scripts/analyze-results.sh results/stress_20250108_143022.json
```

### Custom Tests

```bash
# Custom VUs and duration
./scripts/run-tests.sh --scenario sessions --vus 500 --duration 5m

# Test against staging
./scripts/run-tests.sh --url https://api-staging.example.com --type load

# Direct k6 execution
k6 run --vus 100 --duration 5m scenarios/full-load.js
```

## Key Metrics (Requirement 47)

### API Latency
- **p50**: < 200ms (median)
- **p95**: < 500ms (95th percentile)
- **p99**: < 1000ms (99th percentile)

### Success Rates
- **Session Creation**: > 95%
- **Answer Submission**: > 98%
- **Session Completion**: > 95%

### Error Rate
- **Total Errors**: < 1%

## Interpreting Results

### ✅ Good Performance
```
p50: 145ms ✅
p95: 420ms ✅
p99: 850ms ✅
Error Rate: 0.8% ✅
```

### ⚠️ Warning Signs
```
p95: 650ms ⚠️  (> 500ms threshold)
Error Rate: 2.5% ⚠️  (> 1% threshold)
```

### ❌ Performance Issues
```
p99: 1500ms ❌  (> 1000ms threshold)
Session Creation: 89% ❌  (< 95% threshold)
```

## Common Issues

### Issue: High Latency
**Symptoms**: p95 > 500ms or p99 > 1000ms
**Check**:
- Database connection pool
- Redis memory usage
- Lambda cold starts
**Fix**: See ANALYSIS_GUIDE.md

### Issue: High Error Rate
**Symptoms**: Error rate > 1%
**Check**:
- CloudWatch logs
- Rate limiting (429 errors)
- Database timeouts (503 errors)
**Fix**: Increase throttle limits, optimize queries

### Issue: Low Success Rate
**Symptoms**: Session creation < 95%
**Check**:
- Daily limits
- Cooldown enforcement
- Redis connectivity
**Fix**: Review session management logic

## CloudWatch Metrics

### During Test
```bash
# Database connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=trivia-nft-db \
  --start-time 2025-01-08T14:00:00Z \
  --end-time 2025-01-08T14:15:00Z \
  --period 60 \
  --statistics Average,Maximum

# Redis memory
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name BytesUsedForCache \
  --dimensions Name=CacheClusterId,Value=trivia-nft-redis \
  --start-time 2025-01-08T14:00:00Z \
  --end-time 2025-01-08T14:15:00Z \
  --period 60 \
  --statistics Average,Maximum
```

## File Structure

```
load-tests/
├── README.md                    # Quick start guide
├── QUICK_REFERENCE.md          # This file
├── ANALYSIS_GUIDE.md           # Detailed analysis
├── TEST_EXECUTION_GUIDE.md     # Execution procedures
├── TASK_33_SUMMARY.md          # Complete summary
├── config.js                   # Test configuration
├── scenarios/                  # Test scenarios
│   ├── sessions.js
│   ├── answers.js
│   ├── leaderboard.js
│   └── full-load.js
└── scripts/                    # Helper scripts
    ├── run-tests.sh
    └── analyze-results.sh
```

## Documentation

- **Quick Start**: README.md
- **Analysis**: ANALYSIS_GUIDE.md
- **Execution**: TEST_EXECUTION_GUIDE.md
- **Summary**: TASK_33_SUMMARY.md
- **This Card**: QUICK_REFERENCE.md

## Support

For detailed information:
1. Check README.md for quick start
2. See ANALYSIS_GUIDE.md for bottleneck identification
3. Review TEST_EXECUTION_GUIDE.md for step-by-step instructions
4. Read TASK_33_SUMMARY.md for complete implementation details

## Requirement 47

This load testing suite validates **Requirement 47: Observability - Metrics**:
- ✅ API latency (p50, p95, p99)
- ✅ Session completion rate
- ✅ Mint success rate
- ✅ Active concurrent sessions
- ✅ CloudWatch dashboard metrics
