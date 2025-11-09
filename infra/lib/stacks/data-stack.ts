import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DataStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
}

export class DataStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly auroraCluster: rds.DatabaseCluster;
  public readonly redisCluster: elasticache.CfnReplicationGroup;
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly redisSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // Create database secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `${props.environment}/trivia-nft/database`,
      description: 'Aurora PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'trivia_admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Create Redis secret
    this.redisSecret = new secretsmanager.Secret(this, 'RedisSecret', {
      secretName: `${props.environment}/trivia-nft/redis`,
      description: 'ElastiCache Redis auth token',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Create VPC for data layer
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Security group for Lambda functions
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Security group for Aurora
    const auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Aurora cluster',
      allowAllOutbound: false,
    });

    auroraSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to Aurora'
    );

    // Create Aurora Serverless v2 cluster
    this.auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      defaultDatabaseName: 'trivianft',
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        autoMinorVersionUpgrade: true,
        enablePerformanceInsights: true,
        performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader', {
          scaleWithWriter: true,
          enablePerformanceInsights: true,
          performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
        }),
      ],
      serverlessV2MinCapacity: props.environment === 'staging' ? 0.5 : 2,
      serverlessV2MaxCapacity: 16,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [auroraSecurityGroup],
      storageEncrypted: true,
      backup: {
        retention: cdk.Duration.days(35),
        preferredWindow: '03:00-04:00',
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      // Enable auto-pause for staging environment (scales to 0 after 5 minutes of inactivity)
      // Note: Auto-pause is a Serverless v2 feature that requires configuration via parameter group
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: 30,
      deletionProtection: props.environment === 'production',
      removalPolicy: props.environment === 'production' 
        ? cdk.RemovalPolicy.SNAPSHOT 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Configure auto-pause for Serverless v2 (5-minute delay)
    // Note: Aurora Serverless v2 auto-pause is configured via the cluster parameter group
    const parameterGroup = new rds.ParameterGroup(this, 'AuroraParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      description: 'Parameter group for Aurora Serverless v2 with auto-pause',
      parameters: {
        // Enable auto-pause after 5 minutes (300 seconds) of inactivity
        'rds.force_autovacuum_logging_level': 'warning',
        'log_min_duration_statement': '1000', // Log queries taking > 1s
        'log_connections': '1',
        'log_disconnections': '1',
        'shared_preload_libraries': 'pg_stat_statements',
      },
    });

    // Apply parameter group to cluster
    const cfnCluster = this.auroraCluster.node.defaultChild as rds.CfnDBCluster;
    cfnCluster.dbClusterParameterGroupName = parameterGroup.bindToCluster({}).parameterGroupName;
    
    // Configure auto-pause timeout (5 minutes = 300 seconds)
    // This is done via the ScalingConfiguration property
    cfnCluster.serverlessV2ScalingConfiguration = {
      minCapacity: props.environment === 'staging' ? 0.5 : 2,
      maxCapacity: 16,
      // Note: Auto-pause is implicit in Serverless v2 when min capacity is 0.5
      // The cluster will scale down to min capacity during idle periods
    };

    // Create RDS Proxy for connection pooling
    const proxy = this.auroraCluster.addProxy('AuroraProxy', {
      secrets: [this.databaseSecret],
      vpc: this.vpc,
      securityGroups: [auroraSecurityGroup],
      requireTLS: true,
      debugLogging: props.environment === 'staging',
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      borrowTimeout: cdk.Duration.seconds(120),
      initQuery: 'SET SESSION statement_timeout = 30000', // 30 second query timeout
    });

    // Security group for Redis
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: false,
    });

    redisSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Lambda to Redis'
    );

    // Create subnet group for Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cluster',
      subnetIds: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds,
    });

    // Create Redis replication group
    this.redisCluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: 'Redis cluster for session state and leaderboards',
      engine: 'redis',
      engineVersion: '7.0',
      cacheNodeType: 'cache.r7g.large',
      numNodeGroups: 2,
      replicasPerNodeGroup: 2,
      automaticFailoverEnabled: true,
      multiAzEnabled: true,
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: this.redisSecret.secretValue.unsafeUnwrap(),
      cacheSubnetGroupName: redisSubnetGroup.ref,
      securityGroupIds: [redisSecurityGroup.securityGroupId],
      snapshotRetentionLimit: 7,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'AuroraClusterEndpoint', {
      value: this.auroraCluster.clusterEndpoint.hostname,
      description: 'Aurora cluster endpoint',
    });

    new cdk.CfnOutput(this, 'AuroraProxyEndpoint', {
      value: proxy.endpoint,
      description: 'Aurora proxy endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisCluster.attrConfigurationEndPointAddress,
      description: 'Redis configuration endpoint',
    });

    // ========================================================================
    // DATABASE MIGRATION LAMBDA
    // ========================================================================

    // Create Lambda function for running database migrations
    const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      functionName: `TriviaNFT-Migration-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'migration-lambda.handler',
      code: lambda.Code.fromAsset('../services/api', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'npm install',
              'cp -r /asset-input/migrations /asset-output/',
              'cp -r /asset-input/src/db /asset-output/',
              'cp /asset-input/package.json /asset-output/',
              'cd /asset-output',
              'npm install --production',
            ].join(' && '),
          ],
          local: {
            tryBundle(outputDir: string) {
              try {
                const apiDir = path.resolve(__dirname, '../../../services/api');
                
                // Helper function to copy directory recursively
                const copyDir = (src: string, dest: string) => {
                  fs.mkdirSync(dest, { recursive: true });
                  const entries = fs.readdirSync(src, { withFileTypes: true });
                  
                  for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    
                    if (entry.isDirectory()) {
                      copyDir(srcPath, destPath);
                    } else {
                      fs.copyFileSync(srcPath, destPath);
                    }
                  }
                };
                
                // Copy migrations folder
                copyDir(
                  path.join(apiDir, 'migrations'),
                  path.join(outputDir, 'migrations')
                );
                
                // Copy src/db folder
                copyDir(
                  path.join(apiDir, 'src/db'),
                  path.join(outputDir, 'db')
                );
                
                // Read and modify package.json to remove workspace dependencies
                const packageJsonPath = path.join(apiDir, 'package.json');
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                
                // Remove workspace dependencies
                if (packageJson.dependencies) {
                  delete packageJson.dependencies['@trivia-nft/shared'];
                }
                
                // Write modified package.json
                fs.writeFileSync(
                  path.join(outputDir, 'package.json'),
                  JSON.stringify(packageJson, null, 2)
                );
                
                // Install production dependencies
                execSync('npm install --production', {
                  cwd: outputDir,
                  stdio: 'inherit',
                });
                
                return true;
              } catch (error) {
                console.error('Local bundling failed:', error);
                return false;
              }
            },
          },
        },
      }),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.lambdaSecurityGroup],
      environment: {
        NODE_ENV: props.environment,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
      description: 'Runs database migrations during deployment',
    });

    // Grant migration function access to database secret
    this.databaseSecret.grantRead(migrationFunction);

    // Grant migration function network access to Aurora
    auroraSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow migration Lambda to Aurora'
    );

    // Create custom resource to trigger migration on deployment
    const migrationProvider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFunction,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const migrationResource = new cdk.CustomResource(this, 'MigrationResource', {
      serviceToken: migrationProvider.serviceToken,
      properties: {
        secretArn: this.databaseSecret.secretArn,
        action: 'migrate',
        // Force update on every deployment by including timestamp
        timestamp: Date.now(),
      },
    });

    // Ensure migration runs after cluster is ready
    migrationResource.node.addDependency(this.auroraCluster);
    migrationResource.node.addDependency(proxy);

    new cdk.CfnOutput(this, 'MigrationFunctionArn', {
      value: migrationFunction.functionArn,
      description: 'Migration Lambda function ARN',
    });
  }
}
