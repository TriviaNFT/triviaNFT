# DataStack Implementation Guide

## Overview

The DataStack provides the data persistence layer for the TriviaNFT platform, including:
- **Aurora Serverless v2 PostgreSQL** - Relational database for persistent data
- **ElastiCache Redis** - In-memory cache for session state and leaderboards
- **VPC** - Network isolation for data layer
- **RDS Proxy** - Connection pooling for Lambda functions
- **Migration Lambda** - Automated database schema management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VPC                                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Public     │  │   Private    │  │   Isolated   │     │
│  │   Subnets    │  │   Subnets    │  │   Subnets    │     │
│  │              │  │              │  │              │     │
│  │  NAT Gateway │  │   Lambda     │  │   Aurora     │     │
│  │              │  │   Functions  │  │   Redis      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                           │                   │             │
│                           └───────────────────┘             │
│                        Security Groups                      │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. VPC Configuration

**Subnets:**
- **Public Subnets** (2 AZs): NAT Gateways for outbound internet access
- **Private Subnets** (2 AZs): Lambda functions with internet access via NAT
- **Isolated Subnets** (2 AZs): Aurora and Redis (no internet access)

**CIDR Blocks:**
- VPC: /16 (65,536 IPs)
- Each subnet: /24 (256 IPs)

**NAT Gateways:**
- 1 NAT Gateway (cost optimization)
- Shared across private subnets
- Provides outbound internet for Lambda functions

### 2. Aurora Serverless v2 PostgreSQL

**Configuration:**
- **Engine**: PostgreSQL 15.4
- **Capacity**: 
  - Staging: 0.5 - 16 ACUs
  - Production: 2 - 16 ACUs
- **Instances**:
  - 1 Writer (Serverless v2)
  - 1 Reader (Serverless v2, scales with writer)
- **Auto-Pause**: Scales to minimum capacity during idle periods
- **Encryption**: At rest (AWS KMS) and in transit (SSL/TLS)
- **Backups**: 35-day retention, automated snapshots
- **Performance Insights**: Enabled for monitoring

**Features:**
- Automatic scaling based on workload
- Multi-AZ deployment for high availability
- Point-in-time recovery
- CloudWatch Logs integration
- Deletion protection (production only)

**Connection Methods:**
1. **Direct Connection**: For administrative tasks
2. **RDS Proxy**: For Lambda functions (connection pooling)

### 3. RDS Proxy

**Purpose:**
- Connection pooling for Lambda functions
- Reduces connection overhead
- Improves scalability

**Configuration:**
- **Max Connections**: 100% of available connections
- **Max Idle Connections**: 50%
- **Connection Borrow Timeout**: 120 seconds
- **Init Query**: Sets 30-second statement timeout
- **TLS**: Required for all connections
- **Debug Logging**: Enabled in staging

### 4. ElastiCache Redis

**Configuration:**
- **Engine**: Redis 7.0
- **Node Type**: cache.r7g.large (13.07 GiB memory)
- **Cluster Mode**: Enabled
- **Shards**: 2 (for horizontal scaling)
- **Replicas**: 2 per shard (for high availability)
- **Encryption**: At rest and in transit
- **Auth Token**: Stored in Secrets Manager
- **Automatic Failover**: Enabled
- **Multi-AZ**: Enabled
- **Backups**: 7-day retention

**Use Cases:**
- Active session state (15-minute TTL)
- Daily session limits (24-hour TTL)
- Question seen tracking (24-hour TTL)
- Session locks (15-minute TTL)
- Cooldown timers (60-second TTL)
- Leaderboards (no TTL, real-time updates)

### 5. Security Groups

**Lambda Security Group:**
- Outbound: All traffic (for API calls, Secrets Manager, etc.)
- Inbound: None

**Aurora Security Group:**
- Inbound: Port 5432 from Lambda Security Group
- Outbound: None

**Redis Security Group:**
- Inbound: Port 6379 from Lambda Security Group
- Outbound: None

### 6. Secrets Manager

**Database Secret:**
- **Name**: `{environment}/trivia-nft/database`
- **Contents**: Username, password, host, port, database name
- **Rotation**: Manual (credentials managed by RDS)

**Redis Secret:**
- **Name**: `{environment}/trivia-nft/redis`
- **Contents**: Auth token
- **Rotation**: Manual

## Database Schema

### Tables

1. **players** - User accounts (guest and wallet-connected)
2. **categories** - Trivia categories (Science, History, etc.)
3. **questions** - Trivia questions with multiple choice answers
4. **question_flags** - Player-reported question issues
5. **sessions** - Completed game sessions
6. **seasons** - Competitive seasons (3-month periods)
7. **eligibilities** - Time-limited NFT mint rights
8. **nft_catalog** - Pre-generated NFT metadata and artwork
9. **mints** - NFT minting operations
10. **player_nfts** - NFTs owned by players
11. **forge_operations** - NFT forging operations
12. **season_points** - Player points per season
13. **leaderboard_snapshots** - Daily leaderboard snapshots

### Indexes

**Performance Indexes:**
- B-tree indexes on foreign keys
- Partial indexes for active/filtered records
- Composite indexes for complex queries
- GiST indexes for JSONB queries (if needed)

**Example Indexes:**
```sql
-- Player lookups
CREATE INDEX idx_players_stake_key ON players(stake_key) WHERE stake_key IS NOT NULL;
CREATE INDEX idx_players_anon_id ON players(anon_id) WHERE anon_id IS NOT NULL;

-- Session queries
CREATE INDEX idx_sessions_player ON sessions(player_id, started_at DESC);
CREATE INDEX idx_sessions_perfect ON sessions(player_id, category_id) WHERE score = 10;

-- Leaderboard queries
CREATE INDEX idx_season_points_leaderboard ON season_points(season_id, points DESC, nfts_minted DESC);

-- Active eligibilities
CREATE INDEX idx_eligibilities_active ON eligibilities(player_id, status, expires_at) WHERE status = 'active';
```

### Constraints

**Data Integrity:**
- Primary keys (UUID)
- Foreign keys with CASCADE/RESTRICT
- Check constraints for validation
- Unique constraints for data integrity

**Example Constraints:**
```sql
-- Email format validation
CONSTRAINT chk_email_format CHECK (
  email IS NULL OR (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
)

-- Score range validation
CONSTRAINT chk_score CHECK (score >= 0 AND score <= 10)

-- Status enum validation
CONSTRAINT chk_status CHECK (status IN ('won', 'lost', 'forfeit'))
```

## Database Migrations

### Migration System

**Tool**: Custom migration runner (SQL-based)
**Tracking**: `pgmigrations` table
**Execution**: Lambda function during deployment

### Migration Files

Located in `services/api/migrations/`:
- `1_initial-schema.sql` - Initial schema with all tables

### Running Migrations

**Automatic (Deployment):**
Migrations run automatically during CDK deployment via Custom Resource.

**Manual (Local):**
```bash
cd services/api
export DATABASE_URL="postgresql://user:pass@localhost:5432/trivianft"
pnpm migrate:up
```

**Manual (Lambda):**
```bash
aws lambda invoke \
  --function-name TriviaNFT-Migration-staging \
  --payload '{"action":"migrate","secretArn":"arn:aws:secretsmanager:..."}' \
  response.json
```

### Creating New Migrations

1. Create new SQL file: `migrations/2_add_feature.sql`
2. Write migration SQL with comments
3. Update `src/db/migrate.ts` to include new file
4. Test locally before deploying
5. Deploy via CDK

### Migration Best Practices

1. **Use transactions**: Each migration runs in a transaction
2. **Make idempotent**: Use `IF NOT EXISTS` / `IF EXISTS`
3. **Test rollback**: Ensure migrations can be rolled back
4. **Keep small**: One logical change per migration
5. **Document**: Include comments explaining changes
6. **Test with data**: Test on copy of production data
7. **Avoid data loss**: Back up before dropping columns/tables

## Connection Management

### Lambda Functions

**Connection Pooling:**
```typescript
import { getPool, query } from '@trivia-nft/api/db';

// Get connection pool (reused across invocations)
const pool = await getPool();

// Execute query
const result = await query('SELECT * FROM players WHERE id = $1', [playerId]);

// Execute transaction
await transaction(async (client) => {
  await client.query('INSERT INTO sessions ...');
  await client.query('UPDATE players ...');
});
```

**Environment Variables:**
- `DATABASE_SECRET_ARN`: ARN of database credentials secret
- `DATABASE_URL`: Direct connection string (local development)
- `NODE_ENV`: Environment (production/staging)

### Connection Limits

**Aurora:**
- Max connections: Based on instance size
- Reserved for RDS Proxy: 90%
- Reserved for admin: 10%

**RDS Proxy:**
- Max connections per Lambda: 20
- Connection timeout: 10 seconds
- Statement timeout: 30 seconds

**Lambda:**
- Concurrent executions: 1000 (reserved)
- Connections per execution: 1-20 (pooled)

## Monitoring

### CloudWatch Metrics

**Aurora:**
- `DatabaseConnections` - Active connections
- `CPUUtilization` - CPU usage
- `ServerlessDatabaseCapacity` - Current ACUs
- `ReadLatency` / `WriteLatency` - Query performance
- `FreeableMemory` - Available memory

**Redis:**
- `CurrConnections` - Active connections
- `CPUUtilization` - CPU usage
- `DatabaseMemoryUsagePercentage` - Memory usage
- `CacheHits` / `CacheMisses` - Cache efficiency
- `ReplicationLag` - Replication delay

**RDS Proxy:**
- `DatabaseConnectionsCurrentlyInUse` - Active connections
- `DatabaseConnectionsSetupSucceeded` - Successful connections
- `DatabaseConnectionsSetupFailed` - Failed connections

### CloudWatch Logs

**Aurora:**
- PostgreSQL logs (errors, slow queries)
- Log retention: 30 days

**Migration Lambda:**
- Migration execution logs
- Log retention: 30 days

### Performance Insights

**Enabled for:**
- Aurora Writer instance
- Aurora Reader instance

**Metrics:**
- Top SQL queries
- Wait events
- Database load

## Cost Optimization

### Aurora Serverless v2

**Staging:**
- Min 0.5 ACUs ($0.06/hour when active)
- Auto-pause during idle periods
- Estimated: $20-50/month

**Production:**
- Min 2 ACUs ($0.24/hour)
- No auto-pause
- Estimated: $175-350/month

### ElastiCache Redis

**cache.r7g.large:**
- 2 shards × 3 nodes (1 primary + 2 replicas) = 6 nodes
- $0.226/hour per node
- Estimated: $325/month

### Data Transfer

**Within VPC:** Free
**To Internet:** $0.09/GB (via NAT Gateway)
**Between AZs:** $0.01/GB

### Total Estimated Costs

**Staging:** $350-400/month
**Production:** $500-700/month

## Disaster Recovery

### Backup Strategy

**Aurora:**
- Automated daily snapshots (35-day retention)
- Point-in-time recovery (5-minute granularity)
- Cross-region snapshot copy (optional)
- Manual snapshots before major changes

**Redis:**
- Automated daily snapshots (7-day retention)
- Manual snapshots before major changes

### Recovery Procedures

**Aurora Restore:**
1. Identify restore point (timestamp or snapshot)
2. Create new cluster from snapshot/PITR
3. Update RDS Proxy target
4. Update Lambda environment variables
5. Verify data integrity

**Redis Restore:**
1. Identify snapshot
2. Create new cluster from snapshot
3. Update Lambda environment variables
4. Verify cache functionality

**Full Stack Restore:**
1. Deploy DataStack from CDK
2. Restore Aurora from snapshot
3. Restore Redis from snapshot
4. Run migrations (if needed)
5. Deploy dependent stacks

### RTO/RPO Targets

**Recovery Time Objective (RTO):**
- Aurora: 15-30 minutes
- Redis: 10-15 minutes
- Full stack: 30-60 minutes

**Recovery Point Objective (RPO):**
- Aurora: 5 minutes (PITR)
- Redis: 24 hours (daily snapshots)

## Security

### Network Security

**VPC Isolation:**
- Data layer in isolated subnets
- No direct internet access
- Access only via Lambda functions

**Security Groups:**
- Least privilege access
- Port-specific rules
- Source-based restrictions

### Data Security

**Encryption at Rest:**
- Aurora: AWS KMS encryption
- Redis: Encryption enabled
- Secrets Manager: Automatic encryption

**Encryption in Transit:**
- Aurora: SSL/TLS required
- Redis: TLS enabled
- RDS Proxy: TLS required

**Access Control:**
- IAM roles for Lambda functions
- Secrets Manager for credentials
- No hardcoded credentials

### Compliance

**Data Protection:**
- GDPR-compliant data handling
- PII encryption
- Data retention policies
- Right to deletion support

**Audit Logging:**
- CloudTrail for API calls
- CloudWatch Logs for queries
- VPC Flow Logs for network traffic

## Troubleshooting

### Common Issues

**Connection Timeouts:**
1. Check security group rules
2. Verify Lambda is in correct subnets
3. Check RDS Proxy configuration
4. Verify database is available

**Migration Failures:**
1. Check Lambda logs in CloudWatch
2. Verify database credentials
3. Check VPC and security groups
4. Verify cluster is ready

**Performance Issues:**
1. Check Performance Insights
2. Review slow query logs
3. Analyze connection pool usage
4. Check ACU scaling

**Redis Connection Issues:**
1. Verify auth token
2. Check security group rules
3. Verify cluster endpoint
4. Check TLS configuration

### Debugging Commands

**Check Aurora Status:**
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier trivianft-aurora-staging
```

**Check Redis Status:**
```bash
aws elasticache describe-replication-groups \
  --replication-group-id trivianft-redis-staging
```

**Test Database Connection:**
```bash
psql "postgresql://user:pass@proxy-endpoint:5432/trivianft?sslmode=require"
```

**Test Redis Connection:**
```bash
redis-cli -h redis-endpoint -p 6379 --tls --askpass
```

### Support Resources

**AWS Documentation:**
- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [ElastiCache Redis](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/)
- [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)

**Internal Documentation:**
- `migrations/README.md` - Migration guide
- `SECURITY_STACK_IMPLEMENTATION.md` - Security details
- Design document - Full architecture

## Next Steps

After DataStack deployment:

1. **Verify Resources:**
   - Check Aurora cluster is available
   - Verify Redis cluster is ready
   - Test RDS Proxy connection
   - Confirm migrations ran successfully

2. **Configure Monitoring:**
   - Set up CloudWatch alarms
   - Configure SNS notifications
   - Enable Performance Insights
   - Set up log aggregation

3. **Deploy Dependent Stacks:**
   - ApiStack (Lambda functions)
   - WorkflowStack (Step Functions)
   - ObservabilityStack (Dashboards)

4. **Test Functionality:**
   - Run integration tests
   - Test connection pooling
   - Verify cache operations
   - Test failover scenarios

5. **Document Runbooks:**
   - Backup and restore procedures
   - Scaling procedures
   - Incident response
   - Maintenance windows
