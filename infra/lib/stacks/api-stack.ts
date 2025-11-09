import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { TriviaNftLambda } from '../constructs/lambda-function.js';
import { ApiEndpoint } from '../constructs/api-endpoint.js';
import { LambdaLayers } from '../constructs/lambda-layers.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ApiStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  jwtSecret: secretsmanager.ISecret;
  blockfrostSecret: secretsmanager.ISecret;
  databaseSecret: secretsmanager.ISecret;
  redisSecret: secretsmanager.ISecret;
  ipfsSecret: secretsmanager.ISecret;
  policySigningKeySecret: secretsmanager.ISecret;
  appConfigApplicationId: string;
  appConfigEnvironmentId: string;
  appConfigConfigurationProfileId: string;
  mintStateMachineArn?: string;
  forgeStateMachineArn?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigateway.CfnApi;
  public readonly authorizerFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create CloudWatch Log Group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/trivia-nft-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create HTTP API
    this.httpApi = new apigateway.CfnApi(this, 'HttpApi', {
      name: `trivia-nft-api-${props.environment}`,
      protocolType: 'HTTP',
      corsConfiguration: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 300,
      },
    });

    // Create Lambda layers
    const layers = new LambdaLayers(this, 'LambdaLayers', {
      environment: props.environment,
    });

    // Lambda code location
    const lambdaCode = lambda.Code.fromAsset(
      path.join(__dirname, '../../../services/api/dist')
    );

    // Common Lambda layers
    const commonLayers = [
      layers.dependenciesLayer,
      layers.sharedUtilsLayer,
    ];

    // Common environment variables
    const commonEnv = {
      ENVIRONMENT: props.environment,
      APPCONFIG_APPLICATION_ID: props.appConfigApplicationId,
      APPCONFIG_ENVIRONMENT_ID: props.appConfigEnvironmentId,
      APPCONFIG_CONFIGURATION_PROFILE_ID: props.appConfigConfigurationProfileId,
      JWT_SECRET_ARN: props.jwtSecret.secretArn,
      BLOCKFROST_SECRET_ARN: props.blockfrostSecret.secretArn,
      DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
      REDIS_SECRET_ARN: props.redisSecret.secretArn,
      IPFS_SECRET_ARN: props.ipfsSecret.secretArn,
      POLICY_SIGNING_KEY_SECRET_ARN: props.policySigningKeySecret.secretArn,
    };

    // Common secrets for Lambda functions
    const commonSecrets = [
      props.jwtSecret,
      props.blockfrostSecret,
      props.databaseSecret,
      props.redisSecret,
      props.ipfsSecret,
      props.policySigningKeySecret,
    ];

    // ===== JWT Authorizer Lambda =====
    const authorizerLambda = new TriviaNftLambda(this, 'AuthorizerLambda', {
      functionName: `trivia-nft-authorizer-${props.environment}`,
      handler: 'handlers/index.authorizerHandler',
      code: lambdaCode,
      environment: commonEnv,
      secrets: [props.jwtSecret],
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      layers: commonLayers,
    });

    this.authorizerFunction = authorizerLambda.function;

    // Create JWT Authorizer
    const authorizer = new apigateway.CfnAuthorizer(this, 'JwtAuthorizer', {
      apiId: this.httpApi.ref,
      authorizerType: 'REQUEST',
      authorizerUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${authorizerLambda.function.functionArn}/invocations`,
      identitySource: ['$request.header.Authorization'],
      name: 'jwt-authorizer',
      authorizerPayloadFormatVersion: '2.0',
      authorizerResultTtlInSeconds: 300,
      enableSimpleResponses: false,
    });

    // Grant API Gateway permission to invoke authorizer
    authorizerLambda.function.addPermission('ApiGatewayInvokeAuthorizer', {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.httpApi.ref}/*/*`,
    });

    // ===== Authentication Lambdas =====
    const connectLambda = new TriviaNftLambda(this, 'ConnectLambda', {
      functionName: `trivia-nft-connect-${props.environment}`,
      handler: 'handlers/index.connectHandler',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const profileLambda = new TriviaNftLambda(this, 'ProfileLambda', {
      functionName: `trivia-nft-profile-${props.environment}`,
      handler: 'handlers/index.profileHandler',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const meLambda = new TriviaNftLambda(this, 'MeLambda', {
      functionName: `trivia-nft-me-${props.environment}`,
      handler: 'handlers/index.meHandler',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    // ===== Session Lambdas =====
    const startSessionLambda = new TriviaNftLambda(this, 'StartSessionLambda', {
      functionName: `trivia-nft-start-session-${props.environment}`,
      handler: 'handlers/index.startSession',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      memorySize: 512,
      layers: commonLayers,
    });

    const submitAnswerLambda = new TriviaNftLambda(this, 'SubmitAnswerLambda', {
      functionName: `trivia-nft-submit-answer-${props.environment}`,
      handler: 'handlers/index.submitAnswer',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      memorySize: 512,
      layers: commonLayers,
    });

    const completeSessionLambda = new TriviaNftLambda(this, 'CompleteSessionLambda', {
      functionName: `trivia-nft-complete-session-${props.environment}`,
      handler: 'handlers/index.completeSession',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      memorySize: 512,
      layers: commonLayers,
    });

    const sessionHistoryLambda = new TriviaNftLambda(this, 'SessionHistoryLambda', {
      functionName: `trivia-nft-session-history-${props.environment}`,
      handler: 'handlers/index.getSessionHistory',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    // ===== Question Lambdas =====
    const flagQuestionLambda = new TriviaNftLambda(this, 'FlagQuestionLambda', {
      functionName: `trivia-nft-flag-question-${props.environment}`,
      handler: 'handlers/index.flagHandler',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    // ===== Mint Lambdas =====
    const getEligibilitiesLambda = new TriviaNftLambda(this, 'GetEligibilitiesLambda', {
      functionName: `trivia-nft-get-eligibilities-${props.environment}`,
      handler: 'handlers/index.getEligibilities',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const initiateMintLambda = new TriviaNftLambda(this, 'InitiateMintLambda', {
      functionName: `trivia-nft-initiate-mint-${props.environment}`,
      handler: 'handlers/index.initiateMint',
      code: lambdaCode,
      environment: {
        ...commonEnv,
        MINT_STATE_MACHINE_ARN: props.mintStateMachineArn || '',
      },
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    if (props.mintStateMachineArn) {
      initiateMintLambda.grantStartExecution(props.mintStateMachineArn);
    }

    const getMintStatusLambda = new TriviaNftLambda(this, 'GetMintStatusLambda', {
      functionName: `trivia-nft-get-mint-status-${props.environment}`,
      handler: 'handlers/index.getMintStatus',
      code: lambdaCode,
      environment: {
        ...commonEnv,
        MINT_STATE_MACHINE_ARN: props.mintStateMachineArn || '',
      },
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    if (props.mintStateMachineArn) {
      getMintStatusLambda.grantDescribeExecution(props.mintStateMachineArn);
    }

    // ===== Forge Lambdas =====
    const getForgeProgressLambda = new TriviaNftLambda(this, 'GetForgeProgressLambda', {
      functionName: `trivia-nft-get-forge-progress-${props.environment}`,
      handler: 'handlers/index.getForgeProgress',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const initiateForgeLambda = new TriviaNftLambda(this, 'InitiateForgeLambda', {
      functionName: `trivia-nft-initiate-forge-${props.environment}`,
      handler: 'handlers/index.initiateForge',
      code: lambdaCode,
      environment: {
        ...commonEnv,
        FORGE_STATE_MACHINE_ARN: props.forgeStateMachineArn || '',
      },
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      memorySize: 1024,
      layers: commonLayers,
    });

    if (props.forgeStateMachineArn) {
      initiateForgeLambda.grantStartExecution(props.forgeStateMachineArn);
    }

    const getForgeStatusLambda = new TriviaNftLambda(this, 'GetForgeStatusLambda', {
      functionName: `trivia-nft-get-forge-status-${props.environment}`,
      handler: 'handlers/index.getForgeStatus',
      code: lambdaCode,
      environment: {
        ...commonEnv,
        FORGE_STATE_MACHINE_ARN: props.forgeStateMachineArn || '',
      },
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    if (props.forgeStateMachineArn) {
      getForgeStatusLambda.grantDescribeExecution(props.forgeStateMachineArn);
    }

    // ===== Leaderboard Lambdas =====
    const getGlobalLeaderboardLambda = new TriviaNftLambda(this, 'GetGlobalLeaderboardLambda', {
      functionName: `trivia-nft-get-global-leaderboard-${props.environment}`,
      handler: 'handlers/index.getGlobalLeaderboard',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const getCategoryLeaderboardLambda = new TriviaNftLambda(this, 'GetCategoryLeaderboardLambda', {
      functionName: `trivia-nft-get-category-leaderboard-${props.environment}`,
      handler: 'handlers/index.getCategoryLeaderboard',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    const getSeasonLeaderboardLambda = new TriviaNftLambda(this, 'GetSeasonLeaderboardLambda', {
      functionName: `trivia-nft-get-season-leaderboard-${props.environment}`,
      handler: 'handlers/index.getSeasonLeaderboard',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    // ===== Season Lambdas =====
    const getCurrentSeasonLambda = new TriviaNftLambda(this, 'GetCurrentSeasonLambda', {
      functionName: `trivia-nft-get-current-season-${props.environment}`,
      handler: 'handlers/index.getCurrentSeason',
      code: lambdaCode,
      environment: commonEnv,
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      secrets: commonSecrets,
      layers: commonLayers,
    });

    // ===== API Routes =====

    // Public routes (no auth)
    new ApiEndpoint(this, 'ConnectRoute', {
      api: this.httpApi,
      routeKey: 'POST /auth/connect',
      lambdaFunction: connectLambda.function,
    });

    new ApiEndpoint(this, 'ProfileRoute', {
      api: this.httpApi,
      routeKey: 'POST /auth/profile',
      lambdaFunction: profileLambda.function,
    });

    // Authenticated routes
    new ApiEndpoint(this, 'MeRoute', {
      api: this.httpApi,
      routeKey: 'GET /auth/me',
      lambdaFunction: meLambda.function,
      authorizerId: authorizer.ref,
    });

    // Session routes
    new ApiEndpoint(this, 'StartSessionRoute', {
      api: this.httpApi,
      routeKey: 'POST /sessions/start',
      lambdaFunction: startSessionLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'SubmitAnswerRoute', {
      api: this.httpApi,
      routeKey: 'POST /sessions/{id}/answer',
      lambdaFunction: submitAnswerLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'CompleteSessionRoute', {
      api: this.httpApi,
      routeKey: 'POST /sessions/{id}/complete',
      lambdaFunction: completeSessionLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'SessionHistoryRoute', {
      api: this.httpApi,
      routeKey: 'GET /sessions/history',
      lambdaFunction: sessionHistoryLambda.function,
      authorizerId: authorizer.ref,
    });

    // Question routes
    new ApiEndpoint(this, 'FlagQuestionRoute', {
      api: this.httpApi,
      routeKey: 'POST /questions/flag',
      lambdaFunction: flagQuestionLambda.function,
      authorizerId: authorizer.ref,
    });

    // Mint routes
    new ApiEndpoint(this, 'GetEligibilitiesRoute', {
      api: this.httpApi,
      routeKey: 'GET /eligibilities',
      lambdaFunction: getEligibilitiesLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'InitiateMintRoute', {
      api: this.httpApi,
      routeKey: 'POST /mint/{eligibilityId}',
      lambdaFunction: initiateMintLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'GetMintStatusRoute', {
      api: this.httpApi,
      routeKey: 'GET /mint/{mintId}/status',
      lambdaFunction: getMintStatusLambda.function,
      authorizerId: authorizer.ref,
    });

    // Forge routes
    new ApiEndpoint(this, 'GetForgeProgressRoute', {
      api: this.httpApi,
      routeKey: 'GET /forge/progress',
      lambdaFunction: getForgeProgressLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'InitiateForgeRoute', {
      api: this.httpApi,
      routeKey: 'POST /forge/{type}',
      lambdaFunction: initiateForgeLambda.function,
      authorizerId: authorizer.ref,
    });

    new ApiEndpoint(this, 'GetForgeStatusRoute', {
      api: this.httpApi,
      routeKey: 'GET /forge/{forgeId}/status',
      lambdaFunction: getForgeStatusLambda.function,
      authorizerId: authorizer.ref,
    });

    // Leaderboard routes
    new ApiEndpoint(this, 'GetGlobalLeaderboardRoute', {
      api: this.httpApi,
      routeKey: 'GET /leaderboard/global',
      lambdaFunction: getGlobalLeaderboardLambda.function,
    });

    new ApiEndpoint(this, 'GetCategoryLeaderboardRoute', {
      api: this.httpApi,
      routeKey: 'GET /leaderboard/category/{id}',
      lambdaFunction: getCategoryLeaderboardLambda.function,
    });

    new ApiEndpoint(this, 'GetSeasonLeaderboardRoute', {
      api: this.httpApi,
      routeKey: 'GET /leaderboard/season/{id}',
      lambdaFunction: getSeasonLeaderboardLambda.function,
    });

    // Season routes
    new ApiEndpoint(this, 'GetCurrentSeasonRoute', {
      api: this.httpApi,
      routeKey: 'GET /seasons/current',
      lambdaFunction: getCurrentSeasonLambda.function,
    });

    // Create default stage
    new apigateway.CfnStage(this, 'DefaultStage', {
      apiId: this.httpApi.ref,
      stageName: '$default',
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: apiLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          routeKey: '$context.routeKey',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength',
          integrationError: '$context.integrationErrorMessage',
          authorizerError: '$context.authorizer.error',
        }),
      },
      defaultRouteSettings: {
        throttlingBurstLimit: 500,
        throttlingRateLimit: 1000,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `https://${this.httpApi.ref}.execute-api.${this.region}.amazonaws.com`,
      description: 'API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.httpApi.ref,
      description: 'API Gateway ID',
    });
  }
}
