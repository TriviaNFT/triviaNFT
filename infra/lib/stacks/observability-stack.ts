import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as xray from 'aws-cdk-lib/aws-xray';
import { Construct } from 'constructs';

export interface ObservabilityStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
  apiId?: string;
  auroraCluster?: rds.DatabaseCluster;
  redisCluster?: elasticache.CfnReplicationGroup;
  mintStateMachine?: sfn.StateMachine;
  forgeStateMachine?: sfn.StateMachine;
  lambdaFunctions?: lambda.IFunction[];
}

export class ObservabilityStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly criticalAlarmTopic: sns.Topic;
  public readonly warningAlarmTopic: sns.Topic;
  public readonly apiDashboard: cloudwatch.Dashboard;
  public readonly databaseDashboard: cloudwatch.Dashboard;
  public readonly redisDashboard: cloudwatch.Dashboard;
  public readonly blockchainDashboard: cloudwatch.Dashboard;
  public readonly logsInsightsQueries: logs.CfnQueryDefinition[];
  public readonly xraySamplingRule: xray.CfnSamplingRule;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    // Create SNS topics for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `trivia-nft-alarms-${props.environment}`,
      displayName: `TriviaNFT ${props.environment} Alarms`,
    });

    // Create separate topics for critical and warning alerts
    this.criticalAlarmTopic = new sns.Topic(this, 'CriticalAlarmTopic', {
      topicName: `trivia-nft-critical-alarms-${props.environment}`,
      displayName: `TriviaNFT ${props.environment} Critical Alarms`,
    });

    this.warningAlarmTopic = new sns.Topic(this, 'WarningAlarmTopic', {
      topicName: `trivia-nft-warning-alarms-${props.environment}`,
      displayName: `TriviaNFT ${props.environment} Warning Alarms`,
    });

    // Reference the API Gateway log group created by ApiStack
    // Note: The log group is created by ApiStack, we just reference it here for queries
    const apiLogGroupName = `/aws/apigateway/trivia-nft-${props.environment}`;
    const apiLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'ApiGatewayLogGroup',
      apiLogGroupName
    );

    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/trivia-nft-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create CloudWatch Logs Insights queries
    // Note: These queries will work once ApiStack creates the log group
    this.logsInsightsQueries = this.createLogsInsightsQueries(props.environment, apiLogGroup, lambdaLogGroup);

    // Create X-Ray sampling rule
    this.xraySamplingRule = this.createXRaySamplingRule(props.environment);

    // ===== API Dashboard =====
    this.apiDashboard = new cloudwatch.Dashboard(this, 'ApiDashboard', {
      dashboardName: `TriviaNFT-API-${props.environment}`,
    });

    this.createApiDashboard(props);

    // ===== Database Dashboard =====
    this.databaseDashboard = new cloudwatch.Dashboard(this, 'DatabaseDashboard', {
      dashboardName: `TriviaNFT-Database-${props.environment}`,
    });

    this.createDatabaseDashboard(props);

    // ===== Redis Dashboard =====
    this.redisDashboard = new cloudwatch.Dashboard(this, 'RedisDashboard', {
      dashboardName: `TriviaNFT-Redis-${props.environment}`,
    });

    this.createRedisDashboard(props);

    // ===== Blockchain Dashboard =====
    this.blockchainDashboard = new cloudwatch.Dashboard(this, 'BlockchainDashboard', {
      dashboardName: `TriviaNFT-Blockchain-${props.environment}`,
    });

    this.createBlockchainDashboard(props);

    // Outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS topic ARN for alarms',
    });

    new cdk.CfnOutput(this, 'CriticalAlarmTopicArn', {
      value: this.criticalAlarmTopic.topicArn,
      description: 'SNS topic ARN for critical alarms',
    });

    new cdk.CfnOutput(this, 'WarningAlarmTopicArn', {
      value: this.warningAlarmTopic.topicArn,
      description: 'SNS topic ARN for warning alarms',
    });

    new cdk.CfnOutput(this, 'ApiDashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.apiDashboard.dashboardName}`,
      description: 'API CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'DatabaseDashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.databaseDashboard.dashboardName}`,
      description: 'Database CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'RedisDashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.redisDashboard.dashboardName}`,
      description: 'Redis CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'BlockchainDashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.blockchainDashboard.dashboardName}`,
      description: 'Blockchain CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'XRayConsoleUrl', {
      value: `https://console.aws.amazon.com/xray/home?region=${this.region}#/service-map`,
      description: 'AWS X-Ray service map URL',
    });
  }

  private createApiDashboard(props: ObservabilityStackProps): void {
    const apiId = props.apiId || 'API_NOT_DEPLOYED';

    // API Latency metrics
    const apiLatencyP50 = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'p50',
      period: cdk.Duration.minutes(5),
    });

    const apiLatencyP95 = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'p95',
      period: cdk.Duration.minutes(5),
    });

    const apiLatencyP99 = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'p99',
      period: cdk.Duration.minutes(5),
    });

    // API Error rate
    const api4xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api5xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // API Request count
    const apiRequestCount = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: {
        ApiId: apiId,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // Add widgets to API dashboard
    this.apiDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# TriviaNFT API Metrics - ${props.environment}\n\nMonitoring API latency, error rates, and throughput.`,
        width: 24,
        height: 2,
      })
    );

    this.apiDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Latency (ms)',
        left: [apiLatencyP50, apiLatencyP95, apiLatencyP99],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Milliseconds',
          showUnits: false,
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'API Throughput (requests/min)',
        left: [apiRequestCount],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Requests',
          showUnits: false,
        },
      })
    );

    this.apiDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Errors',
        left: [api4xxErrors, api5xxErrors],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Error Count',
          showUnits: false,
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'API Error Rate (%)',
        left: [
          new cloudwatch.MathExpression({
            expression: '(m1 + m2) / m3 * 100',
            usingMetrics: {
              m1: api4xxErrors,
              m2: api5xxErrors,
              m3: apiRequestCount,
            },
            label: 'Error Rate',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Percentage',
          showUnits: false,
        },
      })
    );

    // Lambda metrics (if functions provided)
    if (props.lambdaFunctions && props.lambdaFunctions.length > 0) {
      const lambdaErrors = props.lambdaFunctions.map((fn) =>
        fn.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
      );

      const lambdaDuration = props.lambdaFunctions.map((fn) =>
        fn.metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })
      );

      this.apiDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Lambda Errors',
          left: lambdaErrors,
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Error Count',
            showUnits: false,
          },
        }),
        new cloudwatch.GraphWidget({
          title: 'Lambda Duration (ms)',
          left: lambdaDuration,
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Milliseconds',
            showUnits: false,
          },
        })
      );
    }
  }

  private createDatabaseDashboard(props: ObservabilityStackProps): void {
    this.databaseDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# TriviaNFT Database Metrics - ${props.environment}\n\nMonitoring Aurora Serverless v2 connections, query performance, and resource utilization.`,
        width: 24,
        height: 2,
      })
    );

    if (props.auroraCluster) {
      const clusterIdentifier = props.auroraCluster.clusterIdentifier;

      // Database connections
      const dbConnections = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'DatabaseConnections',
        dimensionsMap: {
          DBClusterIdentifier: clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      // CPU utilization
      const cpuUtilization = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBClusterIdentifier: clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      // ACU utilization
      const acuUtilization = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'ServerlessDatabaseCapacity',
        dimensionsMap: {
          DBClusterIdentifier: clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      // Query latency
      const readLatency = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'ReadLatency',
        dimensionsMap: {
          DBClusterIdentifier: clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      const writeLatency = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'WriteLatency',
        dimensionsMap: {
          DBClusterIdentifier: clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      this.databaseDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Database Connections',
          left: [dbConnections],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Connections',
            showUnits: false,
          },
        }),
        new cloudwatch.GraphWidget({
          title: 'ACU Utilization',
          left: [acuUtilization],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'ACUs',
            showUnits: false,
          },
        })
      );

      this.databaseDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Query Latency (ms)',
          left: [readLatency, writeLatency],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Milliseconds',
            showUnits: false,
          },
        }),
        new cloudwatch.GraphWidget({
          title: 'CPU Utilization (%)',
          left: [cpuUtilization],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Percentage',
            showUnits: false,
            max: 100,
          },
        })
      );
    } else {
      this.databaseDashboard.addWidgets(
        new cloudwatch.TextWidget({
          markdown: '## Database not yet deployed\n\nMetrics will appear once Aurora cluster is created.',
          width: 24,
          height: 4,
        })
      );
    }
  }

  private createRedisDashboard(props: ObservabilityStackProps): void {
    this.redisDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# TriviaNFT Redis Metrics - ${props.environment}\n\nMonitoring ElastiCache Redis memory, latency, and evictions.`,
        width: 24,
        height: 2,
      })
    );

    if (props.redisCluster) {
      const replicationGroupId = props.redisCluster.ref;

      // Memory utilization
      const memoryUtilization = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      // CPU utilization
      const cpuUtilization = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      // Network bytes in/out
      const networkBytesIn = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'NetworkBytesIn',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const networkBytesOut = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'NetworkBytesOut',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      // Evictions
      const evictions = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'Evictions',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      // Cache hits/misses
      const cacheHits = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CacheHits',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const cacheMisses = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CacheMisses',
        dimensionsMap: {
          ReplicationGroupId: replicationGroupId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      this.redisDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Memory Utilization (%)',
          left: [memoryUtilization],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Percentage',
            showUnits: false,
            max: 100,
          },
        }),
        new cloudwatch.GraphWidget({
          title: 'CPU Utilization (%)',
          left: [cpuUtilization],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Percentage',
            showUnits: false,
            max: 100,
          },
        })
      );

      this.redisDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Cache Hit Rate (%)',
          left: [
            new cloudwatch.MathExpression({
              expression: 'm1 / (m1 + m2) * 100',
              usingMetrics: {
                m1: cacheHits,
                m2: cacheMisses,
              },
              label: 'Hit Rate',
              period: cdk.Duration.minutes(5),
            }),
          ],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Percentage',
            showUnits: false,
            max: 100,
          },
        }),
        new cloudwatch.GraphWidget({
          title: 'Evictions',
          left: [evictions],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Count',
            showUnits: false,
          },
        })
      );

      this.redisDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Network Throughput (bytes)',
          left: [networkBytesIn, networkBytesOut],
          width: 24,
          height: 6,
          leftYAxis: {
            label: 'Bytes',
            showUnits: false,
          },
        })
      );
    } else {
      this.redisDashboard.addWidgets(
        new cloudwatch.TextWidget({
          markdown: '## Redis not yet deployed\n\nMetrics will appear once ElastiCache cluster is created.',
          width: 24,
          height: 4,
        })
      );
    }
  }

  private createBlockchainDashboard(props: ObservabilityStackProps): void {
    this.blockchainDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# TriviaNFT Blockchain Metrics - ${props.environment}\n\nMonitoring NFT minting, forging, and transaction success rates.`,
        width: 24,
        height: 2,
      })
    );

    // Custom metrics for blockchain operations (to be emitted by Lambda functions)
    const mintSuccessRate = new cloudwatch.Metric({
      namespace: 'TriviaNFT',
      metricName: 'MintSuccessRate',
      dimensionsMap: {
        Environment: props.environment,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    });

    const mintConfirmationTime = new cloudwatch.Metric({
      namespace: 'TriviaNFT',
      metricName: 'MintConfirmationTime',
      dimensionsMap: {
        Environment: props.environment,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    });

    const forgeSuccessRate = new cloudwatch.Metric({
      namespace: 'TriviaNFT',
      metricName: 'ForgeSuccessRate',
      dimensionsMap: {
        Environment: props.environment,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    });

    const transactionFailures = new cloudwatch.Metric({
      namespace: 'TriviaNFT',
      metricName: 'TransactionFailures',
      dimensionsMap: {
        Environment: props.environment,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(15),
    });

    this.blockchainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Mint Success Rate (%)',
        left: [mintSuccessRate],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Percentage',
          showUnits: false,
          max: 100,
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Mint Confirmation Time (seconds)',
        left: [mintConfirmationTime],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Seconds',
          showUnits: false,
        },
      })
    );

    this.blockchainDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Forge Success Rate (%)',
        left: [forgeSuccessRate],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Percentage',
          showUnits: false,
          max: 100,
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Transaction Failures',
        left: [transactionFailures],
        width: 12,
        height: 6,
        leftYAxis: {
          label: 'Count',
          showUnits: false,
        },
      })
    );

    // Step Functions metrics (if provided)
    if (props.mintStateMachine) {
      const mintExecutionsFailed = props.mintStateMachine.metricFailed({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const mintExecutionsSucceeded = props.mintStateMachine.metricSucceeded({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      this.blockchainDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Mint Workflow Executions',
          left: [mintExecutionsSucceeded, mintExecutionsFailed],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Count',
            showUnits: false,
          },
        })
      );
    }

    if (props.forgeStateMachine) {
      const forgeExecutionsFailed = props.forgeStateMachine.metricFailed({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const forgeExecutionsSucceeded = props.forgeStateMachine.metricSucceeded({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      this.blockchainDashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'Forge Workflow Executions',
          left: [forgeExecutionsSucceeded, forgeExecutionsFailed],
          width: 12,
          height: 6,
          leftYAxis: {
            label: 'Count',
            showUnits: false,
          },
        })
      );
    }
  }

  /**
   * Create X-Ray sampling rule for distributed tracing
   */
  private createXRaySamplingRule(environment: string): xray.CfnSamplingRule {
    return new xray.CfnSamplingRule(this, 'XRaySamplingRule', {
      samplingRule: {
        ruleName: `TriviaNFT-${environment}`,
        priority: 1000,
        version: 1,
        reservoirSize: 1,
        fixedRate: environment === 'production' ? 0.05 : 0.1, // 5% in prod, 10% in staging
        urlPath: '*',
        host: '*',
        httpMethod: '*',
        serviceName: `trivia-nft-${environment}`,
        serviceType: '*',
        resourceArn: '*',
        attributes: {},
      },
    });
  }

  /**
   * Enable X-Ray tracing on Lambda functions
   */
  public enableXRayTracing(lambdaFunctions: lambda.IFunction[]): void {
    // Note: X-Ray tracing should be enabled when creating Lambda functions
    // by setting tracing: lambda.Tracing.ACTIVE in the function props
    // This method is here for documentation and can be used to verify tracing is enabled
    
    lambdaFunctions.forEach((fn) => {
      // Add X-Ray permissions to Lambda execution role
      if (fn.role) {
        fn.role.addManagedPolicy(
          cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
        );
      }
    });
  }

  /**
   * Subscribe email addresses to alarm topics
   */
  public subscribeEmailsToAlarms(emails: {
    critical?: string[];
    warning?: string[];
  }): void {
    // Subscribe critical emails
    if (emails.critical && emails.critical.length > 0) {
      emails.critical.forEach((email, index) => {
        new sns.Subscription(this, `CriticalEmailSubscription${index}`, {
          topic: this.criticalAlarmTopic,
          protocol: sns.SubscriptionProtocol.EMAIL,
          endpoint: email,
        });
      });
    }

    // Subscribe warning emails
    if (emails.warning && emails.warning.length > 0) {
      emails.warning.forEach((email, index) => {
        new sns.Subscription(this, `WarningEmailSubscription${index}`, {
          topic: this.warningAlarmTopic,
          protocol: sns.SubscriptionProtocol.EMAIL,
          endpoint: email,
        });
      });
    }

    // Subscribe all emails to general alarm topic
    const allEmails = [
      ...(emails.critical || []),
      ...(emails.warning || []),
    ];
    const uniqueEmails = Array.from(new Set(allEmails));
    
    uniqueEmails.forEach((email, index) => {
      new sns.Subscription(this, `GeneralEmailSubscription${index}`, {
        topic: this.alarmTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: email,
      });
    });
  }

  /**
   * Create CloudWatch Logs Insights queries for common troubleshooting scenarios
   */
  private createLogsInsightsQueries(
    environment: string,
    apiLogGroup: logs.ILogGroup,
    lambdaLogGroup: logs.ILogGroup
  ): logs.CfnQueryDefinition[] {
    const queries: logs.CfnQueryDefinition[] = [];

    // Query 1: API Error Patterns
    queries.push(
      new logs.CfnQueryDefinition(this, 'ApiErrorPatternsQuery', {
        name: `TriviaNFT-API-ErrorPatterns-${environment}`,
        queryString: `fields @timestamp, @message, statusCode, error, requestId
| filter statusCode >= 400
| stats count() by statusCode, error
| sort count desc
| limit 20`,
        logGroupNames: [apiLogGroup.logGroupName],
      })
    );

    // Query 2: Slow Database Queries
    queries.push(
      new logs.CfnQueryDefinition(this, 'SlowDatabaseQueriesQuery', {
        name: `TriviaNFT-SlowDatabaseQueries-${environment}`,
        queryString: `fields @timestamp, @message, query, duration, requestId
| filter @message like /database/ or @message like /query/
| filter duration > 1000
| sort duration desc
| limit 50`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 3: Blockchain Transaction Failures
    queries.push(
      new logs.CfnQueryDefinition(this, 'BlockchainTransactionFailuresQuery', {
        name: `TriviaNFT-BlockchainTransactionFailures-${environment}`,
        queryString: `fields @timestamp, @message, txHash, error, operation
| filter @message like /blockchain/ or @message like /transaction/
| filter error != "" or @message like /failed/ or @message like /error/
| sort @timestamp desc
| limit 100`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 4: Lambda Function Errors by Function
    queries.push(
      new logs.CfnQueryDefinition(this, 'LambdaErrorsByFunctionQuery', {
        name: `TriviaNFT-LambdaErrorsByFunction-${environment}`,
        queryString: `fields @timestamp, @message, @logStream, error, errorType
| filter @message like /ERROR/ or level = "error"
| parse @logStream /^.*\\/(?<functionName>[^\\/]+)\\/.*$/
| stats count() by functionName, errorType
| sort count desc`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 5: Session Flow Errors
    queries.push(
      new logs.CfnQueryDefinition(this, 'SessionFlowErrorsQuery', {
        name: `TriviaNFT-SessionFlowErrors-${environment}`,
        queryString: `fields @timestamp, @message, sessionId, playerId, error
| filter @message like /session/
| filter error != "" or @message like /failed/ or @message like /error/
| sort @timestamp desc
| limit 100`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 6: Mint and Forge Operation Tracking
    queries.push(
      new logs.CfnQueryDefinition(this, 'MintForgeOperationsQuery', {
        name: `TriviaNFT-MintForgeOperations-${environment}`,
        queryString: `fields @timestamp, @message, operation, status, txHash, playerId
| filter @message like /mint/ or @message like /forge/
| sort @timestamp desc
| limit 100`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 7: High Latency Requests
    queries.push(
      new logs.CfnQueryDefinition(this, 'HighLatencyRequestsQuery', {
        name: `TriviaNFT-HighLatencyRequests-${environment}`,
        queryString: `fields @timestamp, @message, endpoint, duration, requestId
| filter duration > 500
| sort duration desc
| limit 50`,
        logGroupNames: [apiLogGroup.logGroupName, lambdaLogGroup.logGroupName],
      })
    );

    // Query 8: Authentication Failures
    queries.push(
      new logs.CfnQueryDefinition(this, 'AuthenticationFailuresQuery', {
        name: `TriviaNFT-AuthenticationFailures-${environment}`,
        queryString: `fields @timestamp, @message, stakeKey, error, endpoint
| filter @message like /auth/ or @message like /jwt/ or @message like /unauthorized/
| filter error != "" or statusCode = 401 or statusCode = 403
| sort @timestamp desc
| limit 100`,
        logGroupNames: [apiLogGroup.logGroupName, lambdaLogGroup.logGroupName],
      })
    );

    // Query 9: Redis Connection Issues
    queries.push(
      new logs.CfnQueryDefinition(this, 'RedisConnectionIssuesQuery', {
        name: `TriviaNFT-RedisConnectionIssues-${environment}`,
        queryString: `fields @timestamp, @message, error, operation
| filter @message like /redis/ or @message like /cache/
| filter @message like /connection/ or @message like /timeout/ or @message like /error/
| sort @timestamp desc
| limit 100`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    // Query 10: Step Functions Workflow Failures
    queries.push(
      new logs.CfnQueryDefinition(this, 'StepFunctionsFailuresQuery', {
        name: `TriviaNFT-StepFunctionsFailures-${environment}`,
        queryString: `fields @timestamp, @message, executionArn, error, cause
| filter @message like /step function/ or @message like /workflow/
| filter error != "" or @message like /failed/
| sort @timestamp desc
| limit 100`,
        logGroupNames: [lambdaLogGroup.logGroupName],
      })
    );

    return queries;
  }

  /**
   * Configure CloudWatch alarms for monitoring critical system health
   */
  public configureAlarms(params: {
    apiId?: string;
    auroraCluster?: rds.DatabaseCluster;
    redisCluster?: elasticache.CfnReplicationGroup;
    mintStateMachine?: sfn.StateMachine;
    forgeStateMachine?: sfn.StateMachine;
    lambdaFunctions?: lambda.IFunction[];
  }): void {
    // ===== API Error Rate Alarm =====
    if (params.apiId) {
      const api4xxErrors = new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiId: params.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const api5xxErrors = new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiId: params.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const apiRequestCount = new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Count',
        dimensionsMap: {
          ApiId: params.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      // Alarm when error rate > 5%
      const apiErrorRateAlarm = new cloudwatch.Alarm(this, 'ApiErrorRateAlarm', {
        alarmName: `TriviaNFT-API-ErrorRate-${this.stackName}`,
        alarmDescription: 'API error rate exceeds 5% threshold',
        metric: new cloudwatch.MathExpression({
          expression: '(m1 + m2) / m3 * 100',
          usingMetrics: {
            m1: api4xxErrors,
            m2: api5xxErrors,
            m3: apiRequestCount,
          },
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      apiErrorRateAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));
    }

    // ===== Lambda Function Errors Alarm =====
    if (params.lambdaFunctions && params.lambdaFunctions.length > 0) {
      params.lambdaFunctions.forEach((fn, index) => {
        const lambdaErrorAlarm = new cloudwatch.Alarm(this, `LambdaErrorAlarm${index}`, {
          alarmName: `TriviaNFT-Lambda-${fn.functionName}-Errors`,
          alarmDescription: `Lambda function ${fn.functionName} has more than 10 errors`,
          metric: fn.metricErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          threshold: 10,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        lambdaErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));
      });
    }

    // ===== Database Connection Failures Alarm =====
    if (params.auroraCluster) {
      const dbConnectionFailures = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'FailedSQLServerAgentJobsCount',
        dimensionsMap: {
          DBClusterIdentifier: params.auroraCluster.clusterIdentifier,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const dbConnectionFailureAlarm = new cloudwatch.Alarm(this, 'DbConnectionFailureAlarm', {
        alarmName: `TriviaNFT-Database-ConnectionFailures-${this.stackName}`,
        alarmDescription: 'Database connection failures exceed 5 in 5 minutes',
        metric: dbConnectionFailures,
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      dbConnectionFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));

      // High CPU utilization alarm
      const dbCpuUtilization = new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBClusterIdentifier: params.auroraCluster.clusterIdentifier,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      const dbCpuAlarm = new cloudwatch.Alarm(this, 'DbCpuAlarm', {
        alarmName: `TriviaNFT-Database-HighCPU-${this.stackName}`,
        alarmDescription: 'Database CPU utilization exceeds 80%',
        metric: dbCpuUtilization,
        threshold: 80,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      dbCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.warningAlarmTopic));
    }

    // ===== Redis Memory Pressure Alarm =====
    if (params.redisCluster) {
      const redisMemoryUtilization = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          ReplicationGroupId: params.redisCluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      });

      const redisMemoryAlarm = new cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
        alarmName: `TriviaNFT-Redis-HighMemory-${this.stackName}`,
        alarmDescription: 'Redis memory utilization exceeds 80%',
        metric: redisMemoryUtilization,
        threshold: 80,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      redisMemoryAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.warningAlarmTopic));

      // Redis evictions alarm
      const redisEvictions = new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'Evictions',
        dimensionsMap: {
          ReplicationGroupId: params.redisCluster.ref,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const redisEvictionsAlarm = new cloudwatch.Alarm(this, 'RedisEvictionsAlarm', {
        alarmName: `TriviaNFT-Redis-Evictions-${this.stackName}`,
        alarmDescription: 'Redis is evicting keys due to memory pressure',
        metric: redisEvictions,
        threshold: 100,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      redisEvictionsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.warningAlarmTopic));
    }

    // ===== Blockchain Transaction Failures Alarm =====
    const blockchainFailureRate = new cloudwatch.Metric({
      namespace: 'TriviaNFT',
      metricName: 'TransactionFailureRate',
      dimensionsMap: {
        Environment: this.stackName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(15),
    });

    const blockchainFailureAlarm = new cloudwatch.Alarm(this, 'BlockchainFailureAlarm', {
      alarmName: `TriviaNFT-Blockchain-FailureRate-${this.stackName}`,
      alarmDescription: 'Blockchain transaction failure rate exceeds 10%',
      metric: blockchainFailureRate,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    blockchainFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));

    // ===== Step Function Execution Failures Alarm =====
    if (params.mintStateMachine) {
      const mintFailureAlarm = new cloudwatch.Alarm(this, 'MintStateMachineFailureAlarm', {
        alarmName: `TriviaNFT-MintWorkflow-Failures-${this.stackName}`,
        alarmDescription: 'Mint workflow has more than 3 failures in 5 minutes',
        metric: params.mintStateMachine.metricFailed({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 3,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      mintFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));
    }

    if (params.forgeStateMachine) {
      const forgeFailureAlarm = new cloudwatch.Alarm(this, 'ForgeStateMachineFailureAlarm', {
        alarmName: `TriviaNFT-ForgeWorkflow-Failures-${this.stackName}`,
        alarmDescription: 'Forge workflow has more than 3 failures in 5 minutes',
        metric: params.forgeStateMachine.metricFailed({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 3,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      forgeFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.criticalAlarmTopic));
    }
  }
}
