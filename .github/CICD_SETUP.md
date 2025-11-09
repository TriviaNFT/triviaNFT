# CI/CD Setup Guide

This guide walks you through setting up the complete CI/CD pipeline for TriviaNFT.

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured
- GitHub repository with admin access
- Node.js 20+ and pnpm installed

## Quick Start

### Step 1: Configure AWS OIDC

Run the setup script to create IAM roles:

```bash
cd .github/scripts
chmod +x setup-oidc.sh
./setup-oidc.sh
```

This script will:
- Create OIDC provider in AWS IAM
- Create staging and production IAM roles
- Output role ARNs for GitHub secrets

### Step 2: Add GitHub Secrets

1. Go to your repository: `https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions`

2. Add the following secrets (use values from setup script output):

```
AWS_REGION=us-east-1
AWS_ROLE_ARN_STAGING=arn:aws:iam::ACCOUNT_ID:role/GitHubActions-TriviaNFT-Staging
AWS_ROLE_ARN_PRODUCTION=arn:aws:iam::ACCOUNT_ID:role/GitHubActions-TriviaNFT-Production
```

### Step 3: Deploy Infrastructure

Push to main branch or manually trigger CDK deployment:

```bash
git add .
git commit -m "Add CI/CD workflows"
git push origin main
```

Or manually trigger:
1. Go to Actions tab
2. Select "CDK Deploy" workflow
3. Click "Run workflow"
4. Select environment (staging)

### Step 4: Get CDK Outputs

After infrastructure deployment, get the outputs:

```bash
# For staging
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-WebStack-Staging \
  --query 'Stacks[0].Outputs' \
  --output table

# For production
aws cloudformation describe-stacks \
  --stack-name TriviaNFT-WebStack-Production \
  --query 'Stacks[0].Outputs' \
  --output table
```

### Step 5: Add Deployment Secrets

Add the following secrets with values from CDK outputs:

**Staging:**
```
STAGING_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com
STAGING_S3_BUCKET=trivia-nft-web-staging-xxx
STAGING_CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
```

**Production:**
```
PRODUCTION_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com
PRODUCTION_S3_BUCKET=trivia-nft-web-production-xxx
PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID=E0987654321XYZ
```

### Step 6: Configure GitHub Environments

1. Go to repository Settings > Environments
2. Create "staging" environment:
   - No protection rules (auto-deploy)
   - Add environment URL: `https://staging.trivia-nft.example.com`

3. Create "production" environment:
   - Add required reviewers (recommended)
   - Add environment URL: `https://trivia-nft.example.com`

### Step 7: Test the Pipeline

1. Create a test branch:
```bash
git checkout -b test-cicd
```

2. Make a small change and push:
```bash
echo "# Test" >> README.md
git add README.md
git commit -m "Test CI/CD pipeline"
git push origin test-cicd
```

3. Create a Pull Request
4. Verify CI workflow runs successfully
5. Check for CDK diff comment (if infrastructure changed)
6. Merge PR
7. Verify staging deployment

## Workflow Overview

### Continuous Integration (CI)

**Triggers:** Every push and PR

**Steps:**
1. Install dependencies
2. Run linting
3. Check code formatting
4. Type check TypeScript
5. Run unit tests with coverage
6. Build all packages
7. Upload coverage to Codecov

### CDK Deployment

**Staging (Automatic):**
- Triggers on push to `main` branch
- Deploys infrastructure to staging
- Triggers frontend deployment

**Production (Manual):**
- Manually triggered from Actions tab
- Requires environment approval
- Deploys infrastructure to production
- Creates deployment tag

### Frontend Deployment

**Staging (Automatic):**
- Triggers after successful CDK deployment
- Builds Expo Web application
- Syncs to S3 with optimized caching
- Invalidates CloudFront cache

**Production (Manual):**
- Manually triggered from Actions tab
- Requires environment approval
- Same steps as staging
- Creates deployment tag

## Common Tasks

### Deploy to Staging

Just push to main:
```bash
git push origin main
```

### Deploy to Production

1. Go to Actions tab
2. Select "CDK Deploy" workflow
3. Click "Run workflow"
4. Select `production` environment
5. Confirm and wait for completion
6. Select "Frontend Deploy" workflow
7. Click "Run workflow"
8. Select `production` environment
9. Confirm and wait for completion

### View Deployment Logs

1. Go to Actions tab
2. Click on workflow run
3. Click on job name
4. Expand steps to view logs

### Rollback Deployment

#### Infrastructure Rollback
```bash
# Find the commit to rollback to
git log --oneline

# Revert to that commit
git revert <commit-hash>
git push origin main
```

#### Frontend Rollback
```bash
# Checkout previous version
git checkout <previous-commit>

# Build and deploy manually
pnpm --filter @trivia-nft/web build
aws s3 sync apps/web/dist s3://BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

### Update Secrets

1. Go to repository Settings > Secrets and variables > Actions
2. Click on secret name
3. Click "Update secret"
4. Enter new value
5. Click "Update secret"

## Troubleshooting

### "Error: Credentials could not be loaded"

**Cause:** OIDC authentication failed

**Solution:**
1. Verify OIDC provider exists in AWS IAM
2. Check role ARN in GitHub secrets is correct
3. Verify trust policy includes correct repository
4. Ensure workflow has `id-token: write` permission

### "Error: Stack is in UPDATE_ROLLBACK_COMPLETE state"

**Cause:** Previous CDK deployment failed

**Solution:**
```bash
# Delete the failed stack
aws cloudformation delete-stack --stack-name STACK_NAME

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name STACK_NAME

# Retry deployment
```

### "Error: No space left on device"

**Cause:** GitHub Actions runner out of disk space

**Solution:**
Add cleanup step to workflow:
```yaml
- name: Free disk space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /opt/ghc
    sudo rm -rf "/usr/local/share/boost"
```

### Frontend Build Fails

**Cause:** Missing environment variables

**Solution:**
1. Verify all `EXPO_PUBLIC_*` variables are set
2. Check API URL is correct
3. Verify build command in package.json

### CloudFront Invalidation Fails

**Cause:** Invalid distribution ID or permissions

**Solution:**
1. Verify distribution ID in secrets
2. Check IAM role has `cloudfront:CreateInvalidation` permission
3. Verify distribution exists in correct region

## Security Best Practices

1. **Use OIDC instead of long-lived credentials**
   - No AWS access keys in GitHub secrets
   - Temporary credentials per workflow run

2. **Separate staging and production roles**
   - Different IAM roles for each environment
   - Principle of least privilege

3. **Require approval for production**
   - Use GitHub environment protection rules
   - Add required reviewers

4. **Audit deployments**
   - Review CloudWatch logs
   - Monitor CloudFormation events
   - Check deployment tags

5. **Rotate secrets regularly**
   - Update IAM role policies
   - Rotate API keys
   - Review access logs

## Monitoring

### GitHub Actions

- View workflow runs in Actions tab
- Set up notifications for failed workflows
- Review deployment history

### AWS CloudWatch

- Monitor Lambda function logs
- Check API Gateway metrics
- Review CloudFormation events

### Alerts

Set up alerts for:
- Failed deployments
- High error rates
- Resource limits
- Security issues

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review CloudFormation events in AWS console
3. Check CloudWatch logs for errors
4. Consult the troubleshooting section above
