# AWS AppConfig Implementation

## Overview

AWS AppConfig has been integrated into the TriviaNFT platform to enable dynamic configuration of game parameters without requiring code deployments. This allows for real-time tuning of gameplay mechanics, limits, and rewards.

## Architecture

### Components

1. **AppConfig Application**: `TriviaNFT-{environment}`
2. **AppConfig Environment**: `staging` or `production`
3. **Configuration Profile**: `game-settings`
4. **Deployment Strategy**: Gradual rollout (25% increments over 10 minutes)

### Configuration Structure

The game settings are stored as a JSON document with the following structure:

```json
{
  "session": {
    "questionsPerSession": 10,
    "timerSeconds": 10,
    "cooldownSeconds": 60
  },
  "limits": {
    "dailySessionsConnected": 10,
    "dailySessionsGuest": 5,
    "resetTimeET": "00:00"
  },
  "eligibility": {
    "connectedWindowMinutes": 60,
    "guestWindowMinutes": 25
  },
  "forging": {
    "categoryUltimateCount": 10,
    "masterUltimateCount": 10,
    "seasonalUltimateCount": 2,
    "seasonGraceDays": 7
  },
  "questions": {
    "reusedRatio": 0.5,
    "newRatio": 0.5,
    "poolThreshold": 1000
  },
  "season": {
    "pointsPerCorrect": 1,
    "perfectBonus": 10
  }
}
```

## Configuration Parameters

### Session Settings

- **questionsPerSession** (5-20): Number of questions per trivia session
- **timerSeconds** (5-60): Time limit per question in seconds
- **cooldownSeconds** (0-300): Cooldown period between sessions

### Limits

- **dailySessionsConnected** (1-100): Daily session limit for wallet-connected players
- **dailySessionsGuest** (1-50): Daily session limit for guest players
- **resetTimeET** (HH:MM): Daily reset time in Eastern Time

### Eligibility Windows

- **connectedWindowMinutes** (1-1440): Mint eligibility window for connected players
- **guestWindowMinutes** (1-1440): Mint eligibility window for guest players

### Forging Requirements

- **categoryUltimateCount** (2-20): NFTs required to forge Category Ultimate
- **masterUltimateCount** (2-20): Categories required to forge Master Ultimate
- **seasonalUltimateCount** (1-10): NFTs per category for Seasonal Ultimate
- **seasonGraceDays** (0-30): Grace period after season end for seasonal forging

### Question Management

- **reusedRatio** (0-1): Ratio of reused questions when pool exceeds threshold
- **newRatio** (0-1): Ratio of new questions when pool exceeds threshold
- **poolThreshold** (100-10000): Question pool size threshold

### Season Points

- **pointsPerCorrect** (1-100): Points awarded per correct answer
- **perfectBonus** (0-1000): Bonus points for perfect score

## Implementation Details

### Lambda Integration

The `AppConfigService` class provides a singleton instance that:

1. Retrieves configuration from AWS AppConfig
2. Caches configuration with a 60-second TTL
3. Falls back to default values if AppConfig is unavailable
4. Uses configuration sessions for efficient polling

### Environment Variables

Lambda functions require these environment variables:

- `APPCONFIG_APPLICATION_ID`: AppConfig application ID
- `APPCONFIG_ENVIRONMENT_ID`: AppConfig environment ID
- `APPCONFIG_CONFIGURATION_PROFILE_ID`: Configuration profile ID

These are automatically set by the CDK stack.

### Services Using AppConfig

1. **SessionService**:
   - Daily session limits
   - Session cooldown
   - Questions per session
   - Timer duration
   - Eligibility windows
   - Season points calculation

2. **ForgeService**:
   - Category Ultimate requirements
   - Master Ultimate requirements
   - Seasonal Ultimate requirements
   - Season grace period

3. **QuestionService** (future):
   - Question pool thresholds
   - Reused/new question ratios

## Deployment Strategy

### Gradual Rollout

Configuration changes are deployed using a gradual rollout strategy:

1. **0% → 25%**: Initial deployment to 25% of requests
2. **25% → 50%**: After 2.5 minutes
3. **50% → 75%**: After 5 minutes
4. **75% → 100%**: After 7.5 minutes
5. **Bake Time**: 5 minutes at 100% before marking complete

### Automatic Rollback

If CloudWatch alarms are triggered during deployment, AppConfig automatically rolls back to the previous configuration.

## Updating Configuration

### Via AWS Console

1. Navigate to AWS AppConfig in the AWS Console
2. Select the TriviaNFT application
3. Select the `game-settings` configuration profile
4. Create a new hosted configuration version
5. Deploy the new version using the gradual rollout strategy

### Via AWS CLI

```bash
# Create new configuration version
aws appconfig create-hosted-configuration-version \
  --application-id <app-id> \
  --configuration-profile-id <profile-id> \
  --content file://game-settings.json \
  --content-type "application/json"

# Deploy configuration
aws appconfig start-deployment \
  --application-id <app-id> \
  --environment-id <env-id> \
  --configuration-profile-id <profile-id> \
  --configuration-version <version> \
  --deployment-strategy-id <strategy-id>
```

### Via CDK

Update `infra/lib/config/game-settings.json` and redeploy the stack:

```bash
cd infra
pnpm cdk deploy TriviaNFT-AppConfig-staging
```

## Validation

### JSON Schema Validation

All configuration updates are validated against the JSON schema defined in `infra/lib/config/game-settings-schema.json`. Invalid configurations are rejected before deployment.

### Testing Configuration Changes

1. Deploy to staging environment first
2. Monitor CloudWatch metrics for anomalies
3. Test gameplay with new settings
4. Deploy to production if successful

## Monitoring

### CloudWatch Metrics

Monitor these metrics after configuration changes:

- Session completion rate
- Average session duration
- Daily active users
- Mint success rate
- Forge success rate

### CloudWatch Logs

AppConfig service logs include:

- Configuration fetch attempts
- Cache hits/misses
- Fallback to default values
- Configuration parsing errors

## Caching Strategy

### Lambda-Level Caching

- **TTL**: 60 seconds
- **Scope**: Per Lambda container
- **Invalidation**: Automatic after TTL expires

### Benefits

- Reduces AppConfig API calls
- Improves Lambda performance
- Provides resilience during AppConfig outages

## Fallback Behavior

If AppConfig is unavailable:

1. Use cached configuration if available
2. Fall back to default values
3. Log warning message
4. Continue operation with defaults

This ensures the platform remains operational even if AppConfig has issues.

## Cost Optimization

### AppConfig Pricing

- Configuration requests: $0.0008 per request
- Hosted configuration storage: $0.50 per GB-month

### Estimated Costs

With 60-second caching and 1000 Lambda invocations per minute:

- Requests per hour: ~60 (one per cache expiry)
- Monthly requests: ~43,200
- Monthly cost: ~$0.03

## Security

### IAM Permissions

Lambda execution roles have these AppConfig permissions:

- `appconfig:StartConfigurationSession`
- `appconfig:GetLatestConfiguration`

### Configuration Access

- Configuration is read-only from Lambda
- Updates require AWS Console or CLI access
- All changes are logged in CloudTrail

## Future Enhancements

1. **Feature Flags**: Add boolean flags for enabling/disabling features
2. **A/B Testing**: Support multiple configuration variants
3. **Dynamic Pricing**: Configure NFT mint costs
4. **Event-Based Updates**: Trigger configuration changes based on events
5. **Configuration History**: Track and audit all configuration changes

## Troubleshooting

### Configuration Not Updating

1. Check Lambda logs for AppConfig errors
2. Verify environment variables are set correctly
3. Check IAM permissions
4. Verify deployment completed successfully

### Fallback to Defaults

1. Check AppConfig service health
2. Verify application/environment/profile IDs
3. Check CloudWatch logs for error messages
4. Verify configuration is deployed

### Validation Errors

1. Verify JSON syntax is correct
2. Check values are within allowed ranges
3. Ensure all required fields are present
4. Review JSON schema for constraints

## References

- [AWS AppConfig Documentation](https://docs.aws.amazon.com/appconfig/)
- [AppConfig Best Practices](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-best-practices.html)
- [AppConfig Pricing](https://aws.amazon.com/systems-manager/pricing/#AWS_AppConfig)
