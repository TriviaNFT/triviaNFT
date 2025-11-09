# Load Test Execution Guide

This guide provides step-by-step instructions for executing load tests and analyzing results per **Task 33.2** and **Requirement 47**.

## Prerequisites

Before running load tests, ensure:

1. ✅ k6 is installed (`k6 version`)
2. ✅ API is deployed and accessible
3. ✅ Database (Aurora) is running
4. ✅ Redis cluster is running
5. ✅ Test data is seeded (categories, questions, NFT catalog)
6. ✅ Monitoring is configured (CloudWatch dashboards)

## Test Execution Plan

### Phase 1: Smoke Test (Validation)

**Purpose**: Validate that the API is functional before load testing

**Command**:
```bash
cd load-tests
./scripts/run-tests.sh --type smoke
```

**Expected Results**:
- All requests succeed (0% error rate)
- API responds within acceptable latency
- No crashes or timeouts

**If Smoke Test Fails**:
- Check API health endpoint
- Verify database connectivity
- Review CloudWatch logs for errors
- Fix issues before proceeding

### Phase 2: Load Test (Normal Traffic)

**Purpose**: Test system under normal expected traffic

**Command**:
```bash
./scripts/run-tests.sh --type load
```

**Configuration**:
- Virtual Users: 50
- Duration: 5 minutes
- Ramp-up: 1 minute

**Expected Results**:
- Error rate < 1%
- p95 latency < 500ms
- p99 latency < 1000ms
- Session creation success > 95%

### Phase 3: Stress Test (1000 Concurrent Users)

**Purpose**: Test system under heavy load per Task 33.2

**Command**:
```bash
./scripts/run-tests.sh --type stress
```

**Configuration**:
- Virtual Users: 1000 (peak)
- Duration: 12 minutes
- Ramp-up stages:
  - 0 → 100 users (2 min)
  - 100 → 500 users (2 min)
  - 500 → 1000 users (3 min)
  - Hold at 1000 users (3 min)
  - Ramp down (2 min)

**Expected Results** (Requirement 47):
- Error rate < 1%
- p95 latency < 500ms
- p99 latency < 1000ms
- Session completion rate > 95%
- System remains stable

### Phase 4: Individual Scenario Tests

Test specific endpoints in isolation:

#### Session Load Test
```bash
pnpm test:sessions
```

**Measures**:
- Session creation latency
- Session completion rate
- End-to-end session duration

#### Answer Submission Test
```bash
pnpm test:answers
```

**Measures**:
- Answer submission latency
- Answer processing rate
- Redis operation performance

#### Leaderboard Query Test
```bash
pnpm test:leaderboard
```

**Measures**:
- Leaderboard query latency
- Pagination performance
- Redis ZSET operation speed

## Metrics Collection (Requirement 47)

### 1. API Response Times

**Metrics to Collect**:
- p50 (median latency)
- p95 (95th percentile)
- p99 (99th percentile)
- Average latency
- Maximum latency

**Collection Method**:
```bash
# Run test with JSON output
k6 run --out json=results/metrics.json scenarios/full-load.js

# Extract latency metrics
cat results/metrics.json | jq '.metrics.http_req_duration.values'
```

**Target Thresholds**:
- p50: < 200ms
- p95: < 500ms
- p99: < 1000ms

### 2. Database Query Latency

**Metrics to Collect**:
- Average query execution time
- Slow query count (> 100ms)
- Connection pool utilization
- Active connections

**Collection Method**:
1. Enable PostgreSQL slow query log
2. Monitor CloudWatch RDS metrics during test
3. Query `pg_stat_statements` after test

**CloudWatch Metrics**:
- `DatabaseConnections`
- `ReadLatency`
- `WriteLatency`
- `CPUUtilization`

**Query After Test**:
```sql
-- Top 10 slowest queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. Redis Operation Latency

**Metrics to Collect**:
- GET operation latency
- SET operation latency
- ZREVRANGE operation latency
- Connection count
- Memory usage

**Collection Method**:
1. Monitor CloudWatch ElastiCache metrics during test
2. Use Redis SLOWLOG to identify slow operations

**CloudWatch Metrics**:
- `CacheHits`
- `CacheMisses`
- `CurrConnections`
- `BytesUsedForCache`
- `NetworkBytesIn/Out`

**Redis Commands**:
```bash
# Check slow log
redis-cli SLOWLOG GET 10

# Monitor operations in real-time
redis-cli --latency

# Check memory usage
redis-cli INFO memory
```

### 4. Lambda Function Performance

**Metrics to Collect**:
- Invocation count
- Duration (average, p99)
- Error count
- Throttle count
- Cold start count

**CloudWatch Metrics**:
- `Invocations`
- `Duration`
- `Errors`
- `Throttles`
- `ConcurrentExecutions`

### 5. Active Concurrent Sessions

**Metrics to Collect**:
- Peak concurrent sessions
- Average concurrent sessions
- Session duration distribution

**Collection Method**:
- Custom metric in k6 tests
- Redis key count monitoring
- CloudWatch custom metrics

## Analysis Procedure

### Step 1: Run Analysis Script

```bash
./scripts/analyze-results.sh results/stress_TIMESTAMP.json
```

This provides:
- Overall metrics summary
- Latency percentiles with pass/fail indicators
- Success rates
- Error breakdown
- Concurrency metrics

### Step 2: Identify Bottlenecks

#### Check API Latency

```bash
# Extract endpoint-specific latency
cat results/stress_TIMESTAMP.json | jq '
  .metrics | 
  to_entries | 
  map(select(.key | contains("http_req_duration"))) |
  map({endpoint: .key, p95: .value.values["p(95)"], p99: .value.values["p(99)"]})
'
```

**Questions to Ask**:
- Which endpoints have highest latency?
- Is latency consistent or spiking?
- Does latency increase over time?

#### Check Database Performance

```bash
# View CloudWatch RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=trivia-nft-db \
  --start-time 2025-01-08T14:00:00Z \
  --end-time 2025-01-08T14:15:00Z \
  --period 60 \
  --statistics Average,Maximum
```

**Questions to Ask**:
- Are connections maxed out?
- Are queries slow (> 100ms)?
- Is CPU utilization high (> 80%)?

#### Check Redis Performance

```bash
# View CloudWatch ElastiCache metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CurrConnections \
  --dimensions Name=CacheClusterId,Value=trivia-nft-redis \
  --start-time 2025-01-08T14:00:00Z \
  --end-time 2025-01-08T14:15:00Z \
  --period 60 \
  --statistics Average,Maximum
```

**Questions to Ask**:
- Is memory usage high (> 80%)?
- Are there cache misses?
- Is network bandwidth saturated?

#### Check Lambda Performance

```bash
# View Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=SessionStartFunction \
  --start-time 2025-01-08T14:00:00Z \
  --end-time 2025-01-08T14:15:00Z \
  --period 60 \
  --statistics Average,Maximum
```

**Questions to Ask**:
- Are functions timing out?
- Are there throttling errors?
- Are cold starts impacting latency?

### Step 3: Compare Against Baselines

Create a comparison report:

```bash
# Before optimization
./scripts/run-tests.sh --type stress > results/baseline.txt

# After optimization
./scripts/run-tests.sh --type stress > results/optimized.txt

# Compare
diff results/baseline.txt results/optimized.txt
```

### Step 4: Document Findings

Create a findings document with:

1. **Test Configuration**
   - Date and time
   - Virtual users
   - Duration
   - Environment (staging/production)

2. **Results Summary**
   - API latency (p50, p95, p99)
   - Error rate
   - Success rates
   - Peak concurrency

3. **Bottlenecks Identified**
   - Component (API, DB, Redis, Lambda)
   - Specific issue
   - Impact on performance
   - Evidence (metrics, logs)

4. **Recommendations**
   - Optimization suggestions
   - Infrastructure changes
   - Code improvements
   - Priority (high/medium/low)

## Optimization Strategies

### If API Latency is High

**Symptoms**:
- p95 > 500ms or p99 > 1000ms
- Consistent slow responses

**Optimizations**:
1. Add database indexes
2. Implement caching (Redis)
3. Optimize Lambda function code
4. Increase Lambda memory
5. Enable Lambda provisioned concurrency

### If Database is Bottleneck

**Symptoms**:
- High connection count
- Slow query execution
- High CPU utilization

**Optimizations**:
1. Increase Aurora ACUs
2. Add read replicas
3. Optimize slow queries
4. Increase RDS Proxy connections
5. Implement connection pooling

### If Redis is Bottleneck

**Symptoms**:
- High memory usage
- Slow operations
- Connection timeouts

**Optimizations**:
1. Increase node size
2. Add replicas
3. Optimize data structures
4. Implement connection pooling
5. Set appropriate TTLs

### If Lambda is Bottleneck

**Symptoms**:
- Throttling errors
- Timeout errors
- High cold start latency

**Optimizations**:
1. Increase memory allocation
2. Enable provisioned concurrency
3. Reduce package size
4. Optimize code
5. Increase reserved concurrency

## Test Report Template

```markdown
# Load Test Report - [Date]

## Test Configuration
- **Date**: 2025-01-08
- **Environment**: Staging
- **Test Type**: Stress Test
- **Virtual Users**: 1000 (peak)
- **Duration**: 12 minutes
- **Scenario**: Full load (mixed traffic)

## Results (Requirement 47)

### API Response Times
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| p50    | 145ms | < 200ms   | ✅ Pass |
| p95    | 420ms | < 500ms   | ✅ Pass |
| p99    | 850ms | < 1000ms  | ✅ Pass |

### Success Rates
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Session Creation | 97.2% | > 95% | ✅ Pass |
| Answer Submission | 98.9% | > 98% | ✅ Pass |
| Session Completion | 96.5% | > 95% | ✅ Pass |

### Error Rate
- **Total Error Rate**: 0.8% ✅ (< 1%)
- **429 Rate Limit**: 0.3%
- **503 Service Unavailable**: 0.5%

### Concurrency
- **Peak Concurrent Sessions**: 847
- **Average Concurrent Sessions**: 623

## Database Query Latency
- **Average Query Time**: 12ms
- **p95 Query Time**: 45ms
- **Slow Queries (> 100ms)**: 3
- **Peak Connections**: 78 / 100

## Redis Operation Latency
- **Average GET**: 1.2ms
- **Average SET**: 1.5ms
- **Average ZREVRANGE**: 3.8ms
- **Peak Memory Usage**: 68%

## Bottlenecks Identified

### 1. Database Connection Pool
- **Issue**: Connection pool reached 78% utilization
- **Impact**: Potential bottleneck at higher load
- **Recommendation**: Increase RDS Proxy max connections to 200

### 2. Redis Memory Usage
- **Issue**: Memory usage reached 68%
- **Impact**: May cause evictions at higher load
- **Recommendation**: Add Redis replica for read scaling

## Optimizations Applied
1. Increased RDS Proxy max connections: 100 → 200
2. Added Redis read replica
3. Enabled Lambda provisioned concurrency for session functions

## Recommendations
1. ✅ System is ready for production with current load
2. ⚠️ Monitor database connections closely
3. ⚠️ Consider increasing Aurora max ACUs to 32 for future growth
4. ✅ Implement connection pooling in Lambda functions
5. ✅ Add caching for leaderboard queries

## Conclusion
The system successfully handled 1000 concurrent users with acceptable performance. All metrics meet Requirement 47 thresholds. Minor optimizations recommended for future scalability.
```

## Continuous Testing

### Schedule Regular Tests

```bash
# Weekly load test (cron job)
0 2 * * 1 cd /path/to/load-tests && ./scripts/run-tests.sh --type load

# Pre-release stress test
./scripts/run-tests.sh --type stress --url https://staging.example.com
```

### Automated Monitoring

Integrate with CI/CD:

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run load test
        run: |
          cd load-tests
          ./scripts/run-tests.sh --type load --url ${{ secrets.STAGING_API_URL }}
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-tests/results/
```

## Conclusion

This guide provides comprehensive instructions for:
- ✅ Executing load tests with 1000 concurrent users
- ✅ Measuring API response times (p50, p95, p99)
- ✅ Measuring database query latency
- ✅ Measuring Redis operation latency
- ✅ Identifying bottlenecks
- ✅ Optimizing performance

All requirements of Task 33.2 and Requirement 47 are addressed.
