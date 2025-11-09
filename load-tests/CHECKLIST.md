# Load Testing Checklist

Use this checklist when running load tests to ensure comprehensive testing and analysis.

## Pre-Test Checklist

### Environment Setup
- [ ] k6 is installed (`k6 version`)
- [ ] API endpoint is configured (`export API_BASE_URL=...`)
- [ ] API is deployed and running
- [ ] Database (Aurora) is running and seeded
- [ ] Redis cluster is running
- [ ] Test data is seeded (categories, questions, NFT catalog)

### Monitoring Setup
- [ ] CloudWatch dashboards are configured
- [ ] CloudWatch alarms are set up
- [ ] Access to AWS Console for monitoring
- [ ] Log retention is configured (30 days)

### Documentation Review
- [ ] Read README.md for quick start
- [ ] Review TEST_EXECUTION_GUIDE.md for procedures
- [ ] Understand ANALYSIS_GUIDE.md for analysis

## Test Execution Checklist

### Phase 1: Smoke Test
- [ ] Run smoke test: `./scripts/run-tests.sh --type smoke`
- [ ] Verify 0% error rate
- [ ] Verify API responds within acceptable latency
- [ ] Check for any crashes or timeouts
- [ ] Review CloudWatch logs for errors
- [ ] **If smoke test fails, stop and fix issues**

### Phase 2: Load Test
- [ ] Run load test: `./scripts/run-tests.sh --type load`
- [ ] Monitor CloudWatch metrics during test
- [ ] Verify error rate < 1%
- [ ] Verify p95 latency < 500ms
- [ ] Verify p99 latency < 1000ms
- [ ] Verify session creation success > 95%
- [ ] Save results for baseline comparison

### Phase 3: Stress Test (1000 Users)
- [ ] Run stress test: `./scripts/run-tests.sh --type stress`
- [ ] Monitor CloudWatch metrics during test
- [ ] Watch for error rate spikes
- [ ] Watch for latency degradation
- [ ] Monitor database connections
- [ ] Monitor Redis memory usage
- [ ] Monitor Lambda throttling
- [ ] Save results for analysis

### Phase 4: Individual Scenarios
- [ ] Run session test: `pnpm test:sessions`
- [ ] Run answer test: `pnpm test:answers`
- [ ] Run leaderboard test: `pnpm test:leaderboard`
- [ ] Compare results across scenarios
- [ ] Identify scenario-specific issues

## Metrics Collection Checklist

### API Response Times (Requirement 47)
- [ ] Collect p50 (median latency)
- [ ] Collect p95 (95th percentile)
- [ ] Collect p99 (99th percentile)
- [ ] Collect average latency
- [ ] Collect maximum latency
- [ ] Verify thresholds: p95 < 500ms, p99 < 1000ms

### Database Query Latency
- [ ] Monitor CloudWatch RDS metrics
- [ ] Check `DatabaseConnections` metric
- [ ] Check `ReadLatency` metric
- [ ] Check `WriteLatency` metric
- [ ] Check `CPUUtilization` metric
- [ ] Query `pg_stat_statements` for slow queries
- [ ] Review slow query log

### Redis Operation Latency
- [ ] Monitor CloudWatch ElastiCache metrics
- [ ] Check `CurrConnections` metric
- [ ] Check `BytesUsedForCache` metric
- [ ] Check `CacheHits` and `CacheMisses` metrics
- [ ] Run `redis-cli SLOWLOG GET 10`
- [ ] Run `redis-cli INFO memory`

### Lambda Function Performance
- [ ] Check `Invocations` metric
- [ ] Check `Duration` metric (average, p99)
- [ ] Check `Errors` metric
- [ ] Check `Throttles` metric
- [ ] Check `ConcurrentExecutions` metric
- [ ] Review X-Ray traces for bottlenecks

### Success Rates
- [ ] Collect session creation success rate (target: > 95%)
- [ ] Collect answer submission success rate (target: > 98%)
- [ ] Collect session completion rate (target: > 95%)
- [ ] Collect leaderboard query success rate (target: > 99%)
- [ ] Collect mint success rate (if applicable)

### Concurrency Metrics
- [ ] Collect peak concurrent sessions
- [ ] Collect average concurrent sessions
- [ ] Collect session duration distribution
- [ ] Verify system handles target concurrency

## Analysis Checklist

### Run Analysis Script
- [ ] Run: `./scripts/analyze-results.sh`
- [ ] Review overall metrics summary
- [ ] Review latency percentiles
- [ ] Review success rates
- [ ] Review error breakdown
- [ ] Review concurrency metrics

### Identify Bottlenecks
- [ ] Check API latency by endpoint
- [ ] Check database connection pool utilization
- [ ] Check Redis memory usage
- [ ] Check Lambda throttling
- [ ] Check for error patterns
- [ ] Identify slowest endpoints

### Compare Against Baselines
- [ ] Compare with previous test results
- [ ] Identify performance regressions
- [ ] Identify performance improvements
- [ ] Document changes since last test

### CloudWatch Analysis
- [ ] Review API Gateway metrics
- [ ] Review Lambda metrics
- [ ] Review RDS metrics
- [ ] Review ElastiCache metrics
- [ ] Review X-Ray service map
- [ ] Check for alarm triggers

## Reporting Checklist

### Test Report
- [ ] Document test configuration (date, VUs, duration)
- [ ] Document environment (staging/production)
- [ ] Document API response times (p50, p95, p99)
- [ ] Document success rates
- [ ] Document error rate
- [ ] Document peak concurrent sessions

### Database Metrics
- [ ] Document average query time
- [ ] Document p95 query time
- [ ] Document slow query count
- [ ] Document peak connections
- [ ] Document CPU utilization

### Redis Metrics
- [ ] Document average operation latency
- [ ] Document peak memory usage
- [ ] Document cache hit rate
- [ ] Document connection count

### Bottlenecks
- [ ] List identified bottlenecks
- [ ] Document impact on performance
- [ ] Provide evidence (metrics, logs)
- [ ] Prioritize by severity

### Recommendations
- [ ] List optimization suggestions
- [ ] Prioritize recommendations (high/medium/low)
- [ ] Estimate effort for each optimization
- [ ] Estimate impact of each optimization

## Post-Test Checklist

### Cleanup
- [ ] Save test results to results/ directory
- [ ] Archive results with timestamp
- [ ] Upload results to shared storage (if applicable)
- [ ] Clean up temporary test data (if applicable)

### Documentation
- [ ] Create test report using template
- [ ] Document bottlenecks identified
- [ ] Document recommendations
- [ ] Share report with team

### Follow-Up Actions
- [ ] Create tickets for identified issues
- [ ] Schedule optimization work
- [ ] Plan re-test after optimizations
- [ ] Update monitoring based on findings

### Continuous Improvement
- [ ] Update test scenarios based on findings
- [ ] Update thresholds if needed
- [ ] Improve test coverage if gaps found
- [ ] Document lessons learned

## Optimization Checklist

### If API Latency is High
- [ ] Add database indexes
- [ ] Implement caching (Redis)
- [ ] Optimize Lambda function code
- [ ] Increase Lambda memory
- [ ] Enable Lambda provisioned concurrency
- [ ] Re-test to validate improvements

### If Database is Bottleneck
- [ ] Increase Aurora ACUs
- [ ] Add read replicas
- [ ] Optimize slow queries
- [ ] Increase RDS Proxy connections
- [ ] Implement connection pooling
- [ ] Re-test to validate improvements

### If Redis is Bottleneck
- [ ] Increase node size
- [ ] Add replicas
- [ ] Optimize data structures
- [ ] Implement connection pooling
- [ ] Set appropriate TTLs
- [ ] Re-test to validate improvements

### If Lambda is Bottleneck
- [ ] Increase memory allocation
- [ ] Enable provisioned concurrency
- [ ] Reduce package size
- [ ] Optimize code
- [ ] Increase reserved concurrency
- [ ] Re-test to validate improvements

## Requirement 47 Validation Checklist

### API Latency Metrics
- [ ] p50, p95, p99 are measured
- [ ] Metrics are tagged by endpoint
- [ ] Thresholds are defined and validated
- [ ] Results are displayed in reports

### Session Completion Rate
- [ ] Metric is tracked
- [ ] Threshold is defined (> 95%)
- [ ] Results are displayed in reports

### Mint Success Rate
- [ ] Metric is tracked
- [ ] Results are displayed in reports

### Active Concurrent Sessions
- [ ] Metric is tracked
- [ ] Peak concurrency is reported
- [ ] System handles target concurrency

### CloudWatch Dashboard Metrics
- [ ] Test results align with CloudWatch metrics
- [ ] Dashboards are configured
- [ ] Alarms are set up based on thresholds

## Sign-Off

### Test Completion
- [ ] All test phases completed
- [ ] All metrics collected
- [ ] Analysis completed
- [ ] Report created
- [ ] Recommendations documented

### Approval
- [ ] Test results reviewed by team
- [ ] Bottlenecks acknowledged
- [ ] Optimization plan approved
- [ ] Ready for next phase (deployment/optimization)

---

**Test Date**: _______________

**Tester**: _______________

**Environment**: ☐ Local  ☐ Staging  ☐ Production

**Test Type**: ☐ Smoke  ☐ Load  ☐ Stress  ☐ All

**Result**: ☐ Pass  ☐ Pass with Issues  ☐ Fail

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________
