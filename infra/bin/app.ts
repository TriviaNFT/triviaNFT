#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SecurityStack } from '../lib/stacks/security-stack.js';
import { DataStack } from '../lib/stacks/data-stack.js';
import { AppConfigStack } from '../lib/stacks/appconfig-stack.js';
import { ApiStack } from '../lib/stacks/api-stack.js';
// import { WorkflowStack } from '../lib/stacks/workflow-stack.js';
import { ObservabilityStack } from '../lib/stacks/observability-stack.js';
import { WebStack } from '../lib/stacks/web-stack.js';

const app = new cdk.App();

// Get environment from context or default to staging
const environment = app.node.tryGetContext('environment') || 'staging';

if (environment !== 'staging' && environment !== 'production') {
  throw new Error('Environment must be either "staging" or "production"');
}

// Define stack props
const stackProps: cdk.StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'TriviaNFT',
    Environment: environment,
  },
};

// Create SecurityStack first (provides secrets and WAF)
const securityStack = new SecurityStack(app, `TriviaNFT-Security-${environment}`, {
  ...stackProps,
  environment,
});

// Create DataStack (provides VPC, Aurora, Redis)
const dataStack = new DataStack(app, `TriviaNFT-Data-${environment}`, {
  ...stackProps,
  environment,
});

// Create AppConfigStack (provides game configuration parameters)
const appConfigStack = new AppConfigStack(app, `TriviaNFT-AppConfig-${environment}`, {
  ...stackProps,
  environment,
});

// Create ApiStack (provides API Gateway and Lambda functions)
const apiStack = new ApiStack(app, `TriviaNFT-Api-${environment}`, {
  ...stackProps,
  environment,
  vpc: dataStack.vpc,
  lambdaSecurityGroup: dataStack.lambdaSecurityGroup,
  jwtSecret: securityStack.jwtSecret,
  blockfrostSecret: securityStack.blockfrostSecret,
  ipfsSecret: securityStack.ipfsSecret,
  policySigningKeySecret: securityStack.policySigningKeySecret,
  databaseSecret: dataStack.databaseSecret,
  redisSecret: dataStack.redisSecret,
  appConfigApplicationId: appConfigStack.application.ref,
  appConfigEnvironmentId: appConfigStack.appConfigEnvironment.ref,
  appConfigConfigurationProfileId: appConfigStack.configurationProfile.ref,
});
apiStack.addDependency(dataStack);
apiStack.addDependency(appConfigStack);
apiStack.addDependency(securityStack);

// Create WorkflowStack (provides Step Functions and EventBridge rules)
// TODO: Fix WorkflowStack props - needs apiLambdaRole, vpc, securityGroup
// new WorkflowStack(app, `TriviaNFT-Workflow-${environment}`, {
//   ...stackProps,
//   environment,
//   apiLambdaRole: apiStack.lambdaRole,
//   vpc: dataStack.vpc,
//   securityGroup: dataStack.lambdaSecurityGroup,
// });

// Create ObservabilityStack (provides CloudWatch dashboards and alarms)
new ObservabilityStack(app, `TriviaNFT-Observability-${environment}`, {
  ...stackProps,
  environment,
});

// Create WebStack (provides S3 and CloudFront for static hosting)
const webStack = new WebStack(app, `TriviaNFT-Web-${environment}`, {
  ...stackProps,
  environment,
  webAcl: securityStack.webAcl,
});
webStack.addDependency(securityStack);

app.synth();
