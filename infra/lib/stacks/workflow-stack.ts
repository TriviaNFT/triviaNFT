/**
 * Workflow Stack
 * Step Functions state machines and EventBridge rules
 */

import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

interface WorkflowStackProps extends cdk.StackProps {
  apiLambdaRole: cdk.aws_iam.IRole;
  vpc: cdk.aws_ec2.IVpc;
  securityGroup: cdk.aws_ec2.ISecurityGroup;
  environment: Record<string, string>;
}

export class WorkflowStack extends cdk.Stack {
  public readonly mintStateMachine: sfn.StateMachine;
  public readonly forgeStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: WorkflowStackProps) {
    super(scope, id, props);

    // Create Lambda functions for mint workflow
    const validateEligibilityFn = new lambda.Function(this, 'ValidateEligibility', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/validate-eligibility.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const selectNFTFn = new lambda.Function(this, 'SelectNFT', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/select-nft.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const uploadToIPFSFn = new lambda.Function(this, 'UploadToIPFS', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/upload-to-ipfs.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const buildTransactionFn = new lambda.Function(this, 'BuildTransaction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/build-transaction.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const signTransactionFn = new lambda.Function(this, 'SignTransaction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/sign-transaction.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const submitTransactionFn = new lambda.Function(this, 'SubmitTransaction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/submit-transaction.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const checkConfirmationFn = new lambda.Function(this, 'CheckConfirmation', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/check-confirmation.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const updateDatabaseFn = new lambda.Function(this, 'UpdateDatabase', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/mint/workflow/update-database.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Define Step Function tasks
    const validateEligibility = new tasks.LambdaInvoke(this, 'Validate Eligibility', {
      lambdaFunction: validateEligibilityFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const selectNFT = new tasks.LambdaInvoke(this, 'Select NFT', {
      lambdaFunction: selectNFTFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const uploadToIPFS = new tasks.LambdaInvoke(this, 'Upload to IPFS', {
      lambdaFunction: uploadToIPFSFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const buildTransaction = new tasks.LambdaInvoke(this, 'Build Transaction', {
      lambdaFunction: buildTransactionFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const signTransaction = new tasks.LambdaInvoke(this, 'Sign Transaction', {
      lambdaFunction: signTransactionFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const submitTransaction = new tasks.LambdaInvoke(this, 'Submit Transaction', {
      lambdaFunction: submitTransactionFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const checkConfirmation = new tasks.LambdaInvoke(this, 'Check Confirmation', {
      lambdaFunction: checkConfirmationFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const updateDatabase = new tasks.LambdaInvoke(this, 'Update Database', {
      lambdaFunction: updateDatabaseFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // Wait state for confirmation polling
    const waitForConfirmation = new sfn.Wait(this, 'Wait for Confirmation', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    // Success and failure states
    const mintSuccess = new sfn.Succeed(this, 'Mint Success');
    const mintFailed = new sfn.Fail(this, 'Mint Failed', {
      cause: 'Mint workflow failed',
      error: 'MintError',
    });

    // Check if confirmed
    const isConfirmed = new sfn.Choice(this, 'Is Confirmed?')
      .when(sfn.Condition.booleanEquals('$.confirmed', true), updateDatabase)
      .when(sfn.Condition.numberGreaterThan('$.attemptCount', 10), mintFailed)
      .otherwise(waitForConfirmation);

    // Define workflow
    const definition = validateEligibility
      .next(selectNFT)
      .next(uploadToIPFS)
      .next(buildTransaction)
      .next(signTransaction)
      .next(submitTransaction)
      .next(waitForConfirmation)
      .next(checkConfirmation)
      .next(isConfirmed);

    updateDatabase.next(mintSuccess);

    // Add error handling
    validateEligibility.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    selectNFT.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    uploadToIPFS.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    buildTransaction.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    signTransaction.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    submitTransaction.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    checkConfirmation.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    updateDatabase.addCatch(mintFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // Add retry logic
    const retryConfig = {
      errors: ['States.TaskFailed'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2.0,
    };

    validateEligibility.addRetry(retryConfig);
    selectNFT.addRetry(retryConfig);
    uploadToIPFS.addRetry(retryConfig);
    buildTransaction.addRetry(retryConfig);
    signTransaction.addRetry(retryConfig);
    submitTransaction.addRetry(retryConfig);
    checkConfirmation.addRetry(retryConfig);
    updateDatabase.addRetry(retryConfig);

    // Create log group for state machine
    const logGroup = new logs.LogGroup(this, 'MintStateMachineLogGroup', {
      logGroupName: '/aws/stepfunctions/mint-workflow',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create state machine
    this.mintStateMachine = new sfn.StateMachine(this, 'MintStateMachine', {
      definition,
      stateMachineName: 'trivia-nft-mint-workflow',
      timeout: cdk.Duration.minutes(10),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'MintStateMachineArn', {
      value: this.mintStateMachine.stateMachineArn,
      description: 'ARN of the mint workflow state machine',
      exportName: 'MintStateMachineArn',
    });

    // ========================================================================
    // FORGE WORKFLOW
    // ========================================================================

    // Create Lambda functions for forge workflow
    const validateOwnershipFn = new lambda.Function(this, 'ValidateOwnership', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/validate-ownership.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const buildBurnTxFn = new lambda.Function(this, 'BuildBurnTx', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/build-burn-tx.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const signBurnTxFn = new lambda.Function(this, 'SignBurnTx', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/sign-burn-tx.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const submitBurnFn = new lambda.Function(this, 'SubmitBurn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/submit-burn.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const checkBurnConfirmationFn = new lambda.Function(this, 'CheckBurnConfirmation', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/check-burn-confirmation.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const buildMintUltimateFn = new lambda.Function(this, 'BuildMintUltimate', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/build-mint-ultimate.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const signMintTxFn = new lambda.Function(this, 'SignMintTx', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/sign-mint-tx.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const submitMintFn = new lambda.Function(this, 'SubmitMint', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/submit-mint.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const checkMintConfirmationFn = new lambda.Function(this, 'CheckMintConfirmation', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/check-mint-confirmation.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    const updateForgeRecordFn = new lambda.Function(this, 'UpdateForgeRecord', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/forge/workflow/update-forge-record.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Define Step Function tasks for forge workflow
    const validateOwnership = new tasks.LambdaInvoke(this, 'Validate Ownership', {
      lambdaFunction: validateOwnershipFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const buildBurnTx = new tasks.LambdaInvoke(this, 'Build Burn Transaction', {
      lambdaFunction: buildBurnTxFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const signBurnTx = new tasks.LambdaInvoke(this, 'Sign Burn Transaction', {
      lambdaFunction: signBurnTxFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const submitBurn = new tasks.LambdaInvoke(this, 'Submit Burn', {
      lambdaFunction: submitBurnFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const checkBurnConfirmation = new tasks.LambdaInvoke(this, 'Check Burn Confirmation', {
      lambdaFunction: checkBurnConfirmationFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const buildMintUltimate = new tasks.LambdaInvoke(this, 'Build Mint Ultimate', {
      lambdaFunction: buildMintUltimateFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const signMintTx = new tasks.LambdaInvoke(this, 'Sign Mint Transaction', {
      lambdaFunction: signMintTxFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const submitMint = new tasks.LambdaInvoke(this, 'Submit Mint', {
      lambdaFunction: submitMintFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const checkMintConfirmation = new tasks.LambdaInvoke(this, 'Check Mint Confirmation', {
      lambdaFunction: checkMintConfirmationFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const updateForgeRecord = new tasks.LambdaInvoke(this, 'Update Forge Record', {
      lambdaFunction: updateForgeRecordFn,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    // Wait states for confirmation polling
    const waitForBurnConfirmation = new sfn.Wait(this, 'Wait for Burn Confirmation', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    const waitForMintConfirmation = new sfn.Wait(this, 'Wait for Mint Confirmation', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    // Success and failure states for forge
    const forgeSuccess = new sfn.Succeed(this, 'Forge Success');
    const forgeFailed = new sfn.Fail(this, 'Forge Failed', {
      cause: 'Forge workflow failed',
      error: 'ForgeError',
    });

    // Check if burn confirmed
    const isBurnConfirmed = new sfn.Choice(this, 'Is Burn Confirmed?')
      .when(sfn.Condition.booleanEquals('$.burnConfirmed', true), buildMintUltimate)
      .when(sfn.Condition.numberGreaterThan('$.burnAttemptCount', 10), forgeFailed)
      .otherwise(waitForBurnConfirmation);

    // Check if mint confirmed
    const isMintConfirmed = new sfn.Choice(this, 'Is Mint Confirmed?')
      .when(sfn.Condition.booleanEquals('$.mintConfirmed', true), updateForgeRecord)
      .when(sfn.Condition.numberGreaterThan('$.mintAttemptCount', 10), forgeFailed)
      .otherwise(waitForMintConfirmation);

    // Define forge workflow
    const forgeDefinition = validateOwnership
      .next(buildBurnTx)
      .next(signBurnTx)
      .next(submitBurn)
      .next(waitForBurnConfirmation)
      .next(checkBurnConfirmation)
      .next(isBurnConfirmed);

    buildMintUltimate
      .next(signMintTx)
      .next(submitMint)
      .next(waitForMintConfirmation)
      .next(checkMintConfirmation)
      .next(isMintConfirmed);

    updateForgeRecord.next(forgeSuccess);

    // Add error handling for forge workflow
    validateOwnership.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    buildBurnTx.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    signBurnTx.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    submitBurn.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    checkBurnConfirmation.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    buildMintUltimate.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    signMintTx.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    submitMint.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    checkMintConfirmation.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    updateForgeRecord.addCatch(forgeFailed, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // Add retry logic for forge workflow
    validateOwnership.addRetry(retryConfig);
    buildBurnTx.addRetry(retryConfig);
    signBurnTx.addRetry(retryConfig);
    submitBurn.addRetry(retryConfig);
    checkBurnConfirmation.addRetry(retryConfig);
    buildMintUltimate.addRetry(retryConfig);
    signMintTx.addRetry(retryConfig);
    submitMint.addRetry(retryConfig);
    checkMintConfirmation.addRetry(retryConfig);
    updateForgeRecord.addRetry(retryConfig);

    // Create log group for forge state machine
    const forgeLogGroup = new logs.LogGroup(this, 'ForgeStateMachineLogGroup', {
      logGroupName: '/aws/stepfunctions/forge-workflow',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create forge state machine
    this.forgeStateMachine = new sfn.StateMachine(this, 'ForgeStateMachine', {
      definition: forgeDefinition,
      stateMachineName: 'trivia-nft-forge-workflow',
      timeout: cdk.Duration.minutes(15),
      logs: {
        destination: forgeLogGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });

    // Forge workflow output
    new cdk.CfnOutput(this, 'ForgeStateMachineArn', {
      value: this.forgeStateMachine.stateMachineArn,
      description: 'ARN of the forge workflow state machine',
      exportName: 'ForgeStateMachineArn',
    });

    // ========================================================================
    // EVENTBRIDGE RULES FOR SCHEDULED TASKS
    // ========================================================================

    // Lambda for daily reset (midnight ET)
    const dailyResetFn = new lambda.Function(this, 'DailyReset', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/scheduled/daily-reset.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // EventBridge rule for daily reset (midnight ET = 5 AM UTC)
    const dailyResetRule = new events.Rule(this, 'DailyResetRule', {
      ruleName: 'trivia-nft-daily-reset',
      description: 'Reset daily session limits and question seen sets',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '5', // 5 AM UTC = midnight ET
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    dailyResetRule.addTarget(new targets.LambdaFunction(dailyResetFn));

    // Lambda for eligibility expiration (every minute)
    const eligibilityExpirationFn = new lambda.Function(this, 'EligibilityExpiration', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/scheduled/eligibility-expiration.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // EventBridge rule for eligibility expiration (every minute)
    const eligibilityExpirationRule = new events.Rule(this, 'EligibilityExpirationRule', {
      ruleName: 'trivia-nft-eligibility-expiration',
      description: 'Expire mint eligibilities and return NFTs to stock',
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    });

    eligibilityExpirationRule.addTarget(new targets.LambdaFunction(eligibilityExpirationFn));

    // Lambda for leaderboard snapshot (daily at 1 AM ET)
    const leaderboardSnapshotFn = new lambda.Function(this, 'LeaderboardSnapshot', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/scheduled/leaderboard-snapshot.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // EventBridge rule for leaderboard snapshot (1 AM ET = 6 AM UTC)
    const leaderboardSnapshotRule = new events.Rule(this, 'LeaderboardSnapshotRule', {
      ruleName: 'trivia-nft-leaderboard-snapshot',
      description: 'Take daily snapshot of leaderboard standings',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6', // 6 AM UTC = 1 AM ET
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    leaderboardSnapshotRule.addTarget(new targets.LambdaFunction(leaderboardSnapshotFn));

    // Lambda for season transition (quarterly)
    const seasonTransitionFn = new lambda.Function(this, 'SeasonTransition', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/seasons/transition-season.handler',
      code: lambda.Code.fromAsset('services/api/dist'),
      role: props.apiLambdaRole,
      vpc: props.vpc,
      securityGroups: [props.securityGroup],
      environment: props.environment,
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // EventBridge rule for season transition (first day of quarter at midnight ET)
    // Runs on Jan 1, Apr 1, Jul 1, Oct 1 at 5 AM UTC (midnight ET)
    const seasonTransitionRule = new events.Rule(this, 'SeasonTransitionRule', {
      ruleName: 'trivia-nft-season-transition',
      description: 'Finalize season, award prizes, and start new season',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '5', // 5 AM UTC = midnight ET
        day: '1',
        month: '1,4,7,10', // January, April, July, October
        year: '*',
      }),
    });

    seasonTransitionRule.addTarget(new targets.LambdaFunction(seasonTransitionFn));

    // Outputs for EventBridge rules
    new cdk.CfnOutput(this, 'DailyResetRuleArn', {
      value: dailyResetRule.ruleArn,
      description: 'ARN of the daily reset EventBridge rule',
    });

    new cdk.CfnOutput(this, 'EligibilityExpirationRuleArn', {
      value: eligibilityExpirationRule.ruleArn,
      description: 'ARN of the eligibility expiration EventBridge rule',
    });

    new cdk.CfnOutput(this, 'LeaderboardSnapshotRuleArn', {
      value: leaderboardSnapshotRule.ruleArn,
      description: 'ARN of the leaderboard snapshot EventBridge rule',
    });

    new cdk.CfnOutput(this, 'SeasonTransitionRuleArn', {
      value: seasonTransitionRule.ruleArn,
      description: 'ARN of the season transition EventBridge rule',
    });
  }
}
