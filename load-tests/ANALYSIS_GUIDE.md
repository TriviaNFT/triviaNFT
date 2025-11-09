# Load Test Analysis Guide

This guide helps you analyze load test results and identify performance bottlenecks per **Requirement 47**.

## Key Metrics to Monitor

### 1. API Latency (Requirement 47)

**Target Thresholds:**
- p50 (median): < 200ms
- p95: < 500ms
- p99: < 1000ms

**What to look for:**
- If p95 > 500ms: API is slow for 5% of requests
- If p99 > 1000ms: API is very slow for 1% of requests
- Large gap between p95 and p99: Indicates inconsistent performance

**Common causes:**
- Database query performance
- Redis connection pool exhaustion
- Lambda cold starts
- Network latency

### 2. Error Rate

**Target Threshold:** < 1%

**What to look for:**
- 4xx errors: Client-side issues (validation, rate limiting)
- 5xx errors: Server-side issues (crashes, timeouts)
- Connection errors: Network or infrastructure issues

**Common causes:**
- Rate limiting (429 errors)
- Database connection pool exhaustion (503 errors)
- Lambda timeout (504 errors)
- Memory issues (500 errors)

### 3. Success Rates (Requirement 47)

**Target Thresholds:**
- Session creation: > 95%
- Answer submission: > 98%
- Session completion: > 95%
- Leaderboard queries: > 99%

**What to look for:**
- Low session creation rate: Daily limit or cooldown issues
- Low answer submission rate: Session state management issues
- Low completion rate: Timeout or validation issues

### 4. Concurrent Sessions (Requirement 47)

**What to monitor:**
- Peak concurrent sessions
- Average concurrent sessions
- Session duration

**What to look for:**
- Sessions not completing: Memory leaks or stuck processes
- Very short sessions: Users abandoning due to poor performance
- Very long sessions: Timeout issues or slow responses

## Analyzing Results

### Step 1: Review Summary Output

After running a test, review the console output:

```bash
pnpm test:all
```

Look for:
1. ✅ All thresholds passed
2. ❌ Any failed thresholds
3. Overall error rate
4. Request rate (requests/sec)

### Step 2: Examine Detailed Metrics

Check the JSON output for detailed metrics:

```bash
cat results/full-load-summary.json | jq '.metrics.http_req_duration'
```

Key fields:
- `avg`: Average latency
- `min`: Fastest request
- `max`: Slowest request
- `p(50)`, `p(95)`, `p(99)`: Percentile latencies

### Step 3: Identify Bottlenecks

#### Database Bottlenecks

**Symptoms:**
- High p99 latency (> 1000ms)
- Increasing latency over time
- Connection timeout errors

**Solutions:**
- Increase Aurora ACUs
- Add database indexes
- Optimize queries
- Increase RDS Proxy connection pool

#### Redis Bottlenecks

**Symptoms:**
- Session creation failures
- Answer submission delays
- Leaderboard query slowness

**Solutions:**
- Increase Redis node size
- Add more replicas
- Optimize data structures
- Implement connection pooling

#### Lambda Bottlenecks

**Symptoms:**
- Cold start latency spikes
- Memory errors
- Timeout errors (504)

**Solutions:**
- Increase Lambda memory
- Enable provisioned concurrency
- Optimize function code
- Reduce package size

#### API Gateway Bottlenecks

**Symptoms:**
- 429 rate limit errors
- Consistent high latency
- Throttling errors

**Solutions:**
- Increase throttle limits
- Implement caching
- Use CloudFront for static content
- Optimize request validation

### Step 4: Compare Before/After

When making optimizations, compare results:

```bash
# Before optimization
k6 run scenarios/full-load.js > results/before.txt

# After optimization
k6 run scenarios/full-load.js > results/after.txt

# Compare
diff results/before.txt results/after.txt
```

## Common Performance Issues

### Issue 1: High Session Creation Latency

**Symptoms:**
- Session creation p95 > 500ms
- Slow Redis writes

**Investigation:**
```bash
# Check Redis latency
redis-cli --latency

# Check database query time
# Review CloudWatch Logs for slow queries
```

**Solutions:**
- Optimize question selection query
- Add database indexes on category_id
- Implement Redis pipelining
- Cache question pool counts

### Issue 2: Answer Submission Delays

**Symptoms:**
- Answer endpoint p95 > 300ms
- Session state retrieval slow

**Investigation:**
```bash
# Check Redis GET latency
# Review Lambda execution time in CloudWatch
```

**Solutions:**
- Optimize Redis hash operations
- Reduce session state size
- Implement connection pooling
- Use Redis pipelining for multiple operations

### Issue 3: Leaderboard Query Slowness

**Symptoms:**
- Leaderboard endpoint p95 > 400ms
- ZREVRANGE operations slow

**Investigation:**
```bash
# Check Redis ZSET size
redis-cli ZCARD ladder:global:season-1

# Check query patterns
# Review CloudWatch metrics for Redis
```

**Solutions:**
- Implement pagination limits
- Cache leaderboard pages
- Use Redis read replicas
- Optimize tie-breaker encoding

### Issue 4: Database Connection Exhaustion

**Symptoms:**
- Connection timeout errors
- Increasing error rate over time
- 503 Service Unavailable errors

**Investigation:**
```bash
# Check RDS Proxy connections
# Review CloudWatch metrics for DatabaseConnections
```

**Solutions:**
- Increase RDS Proxy max connections
- Implement connection pooling in Lambda
- Reduce Lambda concurrency
- Optimize query execution time

## Optimization Checklist

After identifying bottlenecks, work through this checklist:

### Database Optimization
- [ ] Add indexes on frequently queried columns
- [ ] Optimize slow queries (use EXPLAIN ANALYZE)
- [ ] Increase Aurora ACUs if needed
- [ ] Enable query caching
- [ ] Implement read replicas for read-heavy workloads

### Redis Optimization
- [ ] Increase node size if memory usage > 80%
- [ ] Add replicas for read scaling
- [ ] Optimize data structures (use hashes instead of strings)
- [ ] Implement connection pooling
- [ ] Set appropriate TTLs to prevent memory bloat

### Lambda Optimization
- [ ] Increase memory allocation
- [ ] Enable provisioned concurrency for critical functions
- [ ] Optimize cold start time (reduce package size)
- [ ] Implement connection reuse
- [ ] Use Lambda layers for shared dependencies

### API Gateway Optimization
- [ ] Increase throttle limits
- [ ] Enable caching for GET endpoints
- [ ] Implement request validation
- [ ] Use CloudFront for edge caching

### Application Code Optimization
- [ ] Reduce database round trips (batch queries)
- [ ] Implement caching strategies
- [ ] Optimize JSON serialization
- [ ] Use async/await properly
- [ ] Minimize Lambda function size

## Monitoring in Production

After load testing, set up continuous monitoring:

### CloudWatch Dashboards
- API latency (p50, p95, p99)
- Error rates by endpoint
- Active concurrent sessions
- Database connection count
- Redis memory usage

### CloudWatch Alarms
- API latency p99 > 1000ms
- Error rate > 1%
- Database connections > 80% of max
- Redis memory > 80%
- Lambda errors > 10/minute

### Regular Load Testing
- Run weekly load tests in staging
- Compare results over time
- Test before major releases
- Validate after infrastructure changes

## Reporting Results

When reporting load test results, include:

1. **Test Configuration**
   - Number of virtual users
   - Test duration
   - Scenario mix (guest/connected/leaderboard)

2. **Key Metrics** (Requirement 47)
   - API latency (p50, p95, p99)
   - Error rate
   - Success rates
   - Peak concurrent sessions

3. **Bottlenecks Identified**
   - Component causing slowness
   - Specific metrics showing the issue
   - Impact on user experience

4. **Optimizations Applied**
   - Changes made
   - Before/after metrics
   - Performance improvement percentage

5. **Recommendations**
   - Further optimizations needed
   - Infrastructure scaling suggestions
   - Code improvements

## Example Report Template

```markdown
# Load Test Results - [Date]

## Configuration
- Virtual Users: 1000
- Duration: 10 minutes
- Scenario: Full load (50% guest, 35% connected, 15% leaderboard)

## Results (Requirement 47)

### API Latency
- p50: 145ms ✅
- p95: 420ms ✅
- p99: 850ms ✅

### Success Rates
- Session Creation: 97.2% ✅
- Answer Submission: 98.9% ✅
- Session Completion: 96.5% ✅

### Errors
- Total Error Rate: 0.8% ✅
- 429 Rate Limit: 0.3%
- 503 Service Unavailable: 0.5%

## Bottlenecks Identified
1. Database connection pool exhaustion at peak load
2. Redis memory usage reached 75%

## Optimizations Applied
1. Increased RDS Proxy max connections from 100 to 200
2. Added Redis replica for read scaling

## Recommendations
1. Consider increasing Aurora max ACUs to 32 for future growth
2. Implement connection pooling in Lambda functions
3. Add caching for leaderboard queries
```
