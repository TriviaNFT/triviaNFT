# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for the TriviaNFT platform.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger**: Push to `main`/`develop` branches, Pull Requests

**Purpose**: Continuous Integration - runs on every push and PR

**Jobs**:
- **lint-and-test**: Runs linting, formatting checks, type checking, and unit tests with coverage
- **e2e-tests**: Runs end-to-end tests using Playwright with Vercel Dev
- **build-infra**: Builds and validates CDK infrastructure code

**Coverage Reporting**: Uploads test coverage to Codecov

**E2E Testing**: 
- Uses Vercel Dev for production-parity testing
- Runs Playwright tests against local Vercel Dev server
- Uploads Playwright HTML report as artifact
- Requires environment variables (DATABASE_URL, REDIS_URL, etc.)

### 2. CDK PR Check (`cdk-pr-check.yml`)

**Trigger**: Pull Requests that modify `infra/**` files

**Purpose**: Preview infrastructure changes before merging

**Jobs**:
- **cdk-synth-and-diff**: Synthesizes CDK templates and generates a diff
- Posts diff results as a PR comment for review

### 3. CDK Deploy (`cdk-deploy.yml`)

**Trigger**: 
- Push to `main` branch (auto-deploys to staging)
- Manual workflow dispatch (for production)

**Purpose**: Deploy infrastructure changes to AWS

**Jobs**:
- **deploy-staging**: Automatically deploys to staging on main branch pushes
- **deploy-production**: Manually triggered production deployment

**Features**:
- OIDC authentication with AWS (no long-lived credentials)
- Environment-specific deployments
- Automatic tagging of production deployments

### 4. Frontend Deploy (`frontend-deploy.yml`)

**Trigger**:
- After successful CDK deployment (staging)
- Manual workflow dispatch (staging or production)

**Purpose**: Build and deploy Expo Web frontend to S3/CloudFront

**Jobs**:
- **deploy-staging**: Deploys frontend to staging environment
- **deploy-production**: Deploys frontend to production environment

**Features**:
- Builds Expo Web application
- Syncs to S3 with optimized cache headers
- Invalidates CloudFront cache
- Environment-specific configuration

## Setup Instructions

### 1. AWS OIDC Configuration

Set up OIDC identity provider in AWS IAM:

```bash
# Create OIDC provider for GitHub Actions
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Create IAM roles for staging and production:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
```

### 2. GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

#### AWS Configuration
- `AWS_REGION`: AWS region (e.g., `us-east-1`)
- `AWS_ROLE_ARN_STAGING`: IAM role ARN for staging deployments
- `AWS_ROLE_ARN_PRODUCTION`: IAM role ARN for production deployments

#### E2E Testing (Required for CI)
- `DATABASE_URL`: PostgreSQL connection string for test database
- `REDIS_URL`: Redis connection URL
- `REDIS_TOKEN`: Redis authentication token
- `INNGEST_EVENT_KEY`: Inngest event key for workflow testing
- `INNGEST_SIGNING_KEY`: Inngest signing key for webhook verification

#### Staging Environment
- `STAGING_API_URL`: API Gateway URL for staging
- `STAGING_S3_BUCKET`: S3 bucket name for staging frontend
- `STAGING_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID for staging

#### Production Environment
- `PRODUCTION_API_URL`: API Gateway URL for production
- `PRODUCTION_S3_BUCKET`: S3 bucket name for production frontend
- `PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID for production

### 3. GitHub Environments

Create two environments in GitHub repository settings:

#### Staging Environment
- Name: `staging`
- URL: `https://staging.trivia-nft.example.com`
- Protection rules: None (auto-deploy)

#### Production Environment
- Name: `production`
- URL: `https://trivia-nft.example.com`
- Protection rules:
  - Required reviewers (recommended)
  - Wait timer (optional)

### 4. IAM Permissions

The IAM roles need the following permissions:

#### CDK Deployment Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "rds:*",
        "elasticache:*",
        "secretsmanager:*",
        "iam:*",
        "cloudfront:*",
        "wafv2:*",
        "logs:*",
        "events:*",
        "states:*",
        "appconfig:*",
        "ec2:*",
        "ssm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Frontend Deployment Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::STAGING_BUCKET/*",
        "arn:aws:s3:::STAGING_BUCKET",
        "arn:aws:s3:::PRODUCTION_BUCKET/*",
        "arn:aws:s3:::PRODUCTION_BUCKET"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deployment Workflows

### Staging Deployment (Automatic)

1. Developer creates PR with changes
2. CI workflow runs tests and checks
3. CDK PR Check shows infrastructure diff (if applicable)
4. PR is reviewed and merged to `main`
5. CDK Deploy workflow deploys infrastructure to staging
6. Frontend Deploy workflow builds and deploys frontend to staging
7. Staging environment is updated

### Production Deployment (Manual)

1. Navigate to Actions tab in GitHub
2. Select "CDK Deploy" workflow
3. Click "Run workflow"
4. Select `production` environment
5. Confirm deployment
6. After CDK deployment completes, run "Frontend Deploy" workflow
7. Select `production` environment
8. Confirm deployment
9. Production environment is updated

## Monitoring Deployments

### View Deployment Status

- GitHub Actions tab shows all workflow runs
- Each environment page shows deployment history
- CloudWatch logs show CDK deployment details

### Rollback Procedures

#### Infrastructure Rollback
```bash
# Revert to previous CDK version
git revert <commit-hash>
git push origin main

# Or manually deploy previous version
git checkout <previous-commit>
pnpm --filter @trivia-nft/infra deploy --context environment=production
```

#### Frontend Rollback
```bash
# Sync previous build to S3
aws s3 sync <previous-build-dir> s3://PRODUCTION_BUCKET --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Troubleshooting

### CDK Deployment Fails

1. Check CloudFormation console for stack events
2. Review CloudWatch logs for Lambda errors
3. Verify IAM permissions are correct
4. Check for resource limits (VPC, EIP, etc.)

### Frontend Deployment Fails

1. Verify S3 bucket exists and is accessible
2. Check CloudFront distribution ID is correct
3. Verify build output exists in `apps/web/dist`
4. Check AWS credentials are valid

### OIDC Authentication Fails

1. Verify OIDC provider is configured in AWS
2. Check IAM role trust policy includes correct repository
3. Verify role ARN in GitHub secrets is correct
4. Check GitHub Actions has `id-token: write` permission

### E2E Tests Fail

1. **Vercel Dev won't start**:
   - Check all required environment variables are set in GitHub secrets
   - Verify DATABASE_URL, REDIS_URL, REDIS_TOKEN, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
   - Check Vercel CLI is installed correctly in workflow

2. **Tests timeout**:
   - Vercel Dev can take 60-120 seconds to start in CI
   - Playwright config has 120 second timeout - this should be sufficient
   - Check workflow logs for Vercel Dev startup errors

3. **Database connection fails**:
   - Verify DATABASE_URL points to accessible test database
   - Ensure test database allows connections from GitHub Actions runners
   - Consider using a cloud-hosted test database (Neon, Supabase, etc.)

4. **Environment variables not loaded**:
   - Verify secrets are added to GitHub repository settings
   - Check secret names match exactly (case-sensitive)
   - Ensure secrets are available to the e2e-tests job

5. **Playwright report not generated**:
   - Check the "Actions" tab > workflow run > "Artifacts" section
   - Download "playwright-report" artifact to view detailed test results
   - Reports are retained for 30 days

## Best Practices

1. **Always review CDK diffs** before merging infrastructure changes
2. **Test in staging first** before deploying to production
3. **Use manual approval** for production deployments
4. **Monitor CloudWatch** after deployments for errors
5. **Tag production deployments** for easy rollback reference
6. **Keep secrets up to date** in GitHub repository settings
7. **Review IAM permissions** regularly for least privilege
8. **Run E2E tests locally** before pushing to ensure they pass in CI
9. **Use test databases** for E2E tests, never production databases
10. **Review Playwright reports** when E2E tests fail to diagnose issues
11. **Keep Vercel CLI updated** in CI workflow for latest features and fixes

## E2E Testing Setup Quick Start

To enable E2E tests in CI, you need to configure test environment secrets:

1. **Set up a test database** (recommended: Neon or Supabase free tier)
2. **Set up test Redis** (recommended: Upstash free tier)
3. **Get Inngest credentials** from your Inngest account
4. **Add secrets to GitHub**:
   ```bash
   # Go to: Repository Settings > Secrets and variables > Actions
   # Add these secrets:
   - DATABASE_URL
   - REDIS_URL
   - REDIS_TOKEN
   - INNGEST_EVENT_KEY
   - INNGEST_SIGNING_KEY
   ```
5. **Verify E2E tests run locally** with `pnpm --filter @trivia-nft/web test:e2e`
6. **Push changes** and check the "e2e-tests" job in GitHub Actions

**Important**: Use separate test credentials, never production credentials!

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
