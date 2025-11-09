import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface SecurityStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
}

export class SecurityStack extends cdk.Stack {
  public readonly jwtSecret: secretsmanager.ISecret;
  public readonly blockfrostSecret: secretsmanager.ISecret;
  public readonly ipfsSecret: secretsmanager.ISecret;
  public readonly policySigningKeySecret: secretsmanager.ISecret;
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly wafLogBucket: s3.IBucket;
  public readonly secretsAccessPolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Create Lambda function for JWT secret rotation
    const jwtRotationFunction = new lambda.Function(this, 'JwtRotationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          const AWS = require('aws-sdk');
          const secretsManager = new AWS.SecretsManager();
          const crypto = require('crypto');
          
          const token = event.ClientRequestToken;
          const arn = event.SecretId;
          const step = event.Step;
          
          if (step === 'createSecret') {
            const newSecret = crypto.randomBytes(64).toString('hex');
            await secretsManager.putSecretValue({
              SecretId: arn,
              ClientRequestToken: token,
              SecretString: JSON.stringify({ algorithm: 'HS256', secret: newSecret }),
              VersionStages: ['AWSPENDING']
            }).promise();
          } else if (step === 'setSecret') {
            // No external service to update
          } else if (step === 'testSecret') {
            // Verify the secret is valid
            const secret = await secretsManager.getSecretValue({
              SecretId: arn,
              VersionStage: 'AWSPENDING'
            }).promise();
            const parsed = JSON.parse(secret.SecretString);
            if (!parsed.secret || parsed.secret.length < 32) {
              throw new Error('Invalid secret format');
            }
          } else if (step === 'finishSecret') {
            await secretsManager.updateSecretVersionStage({
              SecretId: arn,
              VersionStage: 'AWSCURRENT',
              MoveToVersionId: token,
              RemoveFromVersionId: event.Token
            }).promise();
          }
          
          return { statusCode: 200 };
        };
      `),
      timeout: cdk.Duration.minutes(5),
      description: 'Rotates JWT signing secret',
    });

    // Create Lambda function for policy signing key rotation
    const policyKeyRotationFunction = new lambda.Function(this, 'PolicyKeyRotationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          const AWS = require('aws-sdk');
          const secretsManager = new AWS.SecretsManager();
          const crypto = require('crypto');
          
          const token = event.ClientRequestToken;
          const arn = event.SecretId;
          const step = event.Step;
          
          if (step === 'createSecret') {
            // Generate new Ed25519 key pair (placeholder - in production use proper Cardano key generation)
            const keyPair = crypto.generateKeyPairSync('ed25519', {
              publicKeyEncoding: { type: 'spki', format: 'der' },
              privateKeyEncoding: { type: 'pkcs8', format: 'der' }
            });
            const cborHex = keyPair.privateKey.toString('hex');
            
            await secretsManager.putSecretValue({
              SecretId: arn,
              ClientRequestToken: token,
              SecretString: JSON.stringify({ 
                type: 'PaymentSigningKeyShelley_ed25519',
                cborHex: cborHex,
                description: 'Auto-rotated policy signing key'
              }),
              VersionStages: ['AWSPENDING']
            }).promise();
          } else if (step === 'setSecret') {
            // Update policy on blockchain if needed
            console.log('Policy key rotation - update blockchain policy if required');
          } else if (step === 'testSecret') {
            const secret = await secretsManager.getSecretValue({
              SecretId: arn,
              VersionStage: 'AWSPENDING'
            }).promise();
            const parsed = JSON.parse(secret.SecretString);
            if (!parsed.cborHex || parsed.cborHex.length < 64) {
              throw new Error('Invalid key format');
            }
          } else if (step === 'finishSecret') {
            await secretsManager.updateSecretVersionStage({
              SecretId: arn,
              VersionStage: 'AWSCURRENT',
              MoveToVersionId: token,
              RemoveFromVersionId: event.Token
            }).promise();
          }
          
          return { statusCode: 200 };
        };
      `),
      timeout: cdk.Duration.minutes(5),
      description: 'Rotates Cardano policy signing key',
    });

    // Create secrets for application configuration with rotation
    this.jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: `${props.environment}/trivia-nft/jwt-secret`,
      description: 'JWT signing secret for authentication (rotates every 90 days)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ algorithm: 'HS256' }),
        generateStringKey: 'secret',
        excludePunctuation: true,
        passwordLength: 64,
      },
    });

    // Add rotation schedule for JWT secret
    new secretsmanager.RotationSchedule(this, 'JwtSecretRotation', {
      secret: this.jwtSecret,
      rotationLambda: jwtRotationFunction,
      automaticallyAfter: cdk.Duration.days(90),
    });

    this.blockfrostSecret = new secretsmanager.Secret(this, 'BlockfrostSecret', {
      secretName: `${props.environment}/trivia-nft/blockfrost`,
      description: 'Blockfrost API credentials for Cardano blockchain access',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          projectId: 'PLACEHOLDER_UPDATE_MANUALLY',
          network: props.environment === 'production' ? 'mainnet' : 'preprod',
          url: props.environment === 'production' 
            ? 'https://cardano-mainnet.blockfrost.io/api/v0'
            : 'https://cardano-preprod.blockfrost.io/api/v0',
        }),
        generateStringKey: 'apiKey',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.ipfsSecret = new secretsmanager.Secret(this, 'IpfsSecret', {
      secretName: `${props.environment}/trivia-nft/ipfs`,
      description: 'IPFS/NFT.Storage API credentials for NFT metadata storage',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          provider: 'blockfrost',
          fallbackProvider: 'nft.storage',
        }),
        generateStringKey: 'apiKey',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.policySigningKeySecret = new secretsmanager.Secret(this, 'PolicySigningKeySecret', {
      secretName: `${props.environment}/trivia-nft/policy-signing-key`,
      description: 'Cardano policy signing key for NFT minting (rotates every 90 days)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          type: 'PaymentSigningKeyShelley_ed25519',
          description: 'Centralized policy signing key for MVP',
        }),
        generateStringKey: 'cborHex',
        excludePunctuation: true,
        passwordLength: 128,
      },
    });

    // Add rotation schedule for policy signing key
    new secretsmanager.RotationSchedule(this, 'PolicyKeyRotation', {
      secret: this.policySigningKeySecret,
      rotationLambda: policyKeyRotationFunction,
      automaticallyAfter: cdk.Duration.days(90),
    });

    // Grant rotation functions permission to manage secrets
    this.jwtSecret.grantWrite(jwtRotationFunction);
    this.policySigningKeySecret.grantWrite(policyKeyRotationFunction);

    // Create IAM managed policy for Lambda functions to access secrets
    this.secretsAccessPolicy = new iam.ManagedPolicy(this, 'SecretsAccessPolicy', {
      managedPolicyName: `TriviaNFT-SecretsAccess-${props.environment}`,
      description: 'Allows Lambda functions to read application secrets',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
          ],
          resources: [
            this.jwtSecret.secretArn,
            this.blockfrostSecret.secretArn,
            this.ipfsSecret.secretArn,
            this.policySigningKeySecret.secretArn,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['kms:Decrypt'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'kms:ViaService': `secretsmanager.${this.region}.amazonaws.com`,
            },
          },
        }),
      ],
    });

    // Create S3 bucket for WAF logs
    this.wafLogBucket = new s3.Bucket(this, 'WafLogBucket', {
      bucketName: `trivia-nft-waf-logs-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      serverAccessLogsPrefix: 'access-logs/',
    });

    // Create WAF WebACL with comprehensive security rules
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `TriviaNFT-${props.environment}-WebAcl`,
      },
      captchaConfig: {
        immunityTimeProperty: {
          immunityTime: 300, // 5 minutes immunity after solving CAPTCHA
        },
      },
      rules: [
        // Rule 1: Rate limiting with CAPTCHA challenge (100 requests per 5 minutes per IP)
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: 'IP',
              evaluationWindowSec: 300, // 5 minutes
              scopeDownStatement: {
                notStatement: {
                  statement: {
                    byteMatchStatement: {
                      searchString: 'health',
                      fieldToMatch: { uriPath: {} },
                      textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                      positionalConstraint: 'CONTAINS',
                    },
                  },
                },
              },
            },
          },
          action: {
            captcha: {
              customRequestHandling: {
                insertHeaders: [
                  {
                    name: 'x-rate-limited',
                    value: 'true',
                  },
                ],
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `RateLimit-${props.environment}`,
          },
        },
        // Rule 2: IP reputation list - Block known malicious IPs
        {
          name: 'IPReputationList',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `IPReputation-${props.environment}`,
          },
        },
        // Rule 3: Anonymous IP list - Challenge requests from VPNs, proxies, Tor
        {
          name: 'AnonymousIPList',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAnonymousIpList',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `AnonymousIP-${props.environment}`,
          },
        },
        // Rule 4: Common rule set - Protection against common threats
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                // Exclude rules that might cause false positives
                { name: 'SizeRestrictions_BODY' },
                { name: 'GenericRFI_BODY' },
              ],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `CommonRuleSet-${props.environment}`,
          },
        },
        // Rule 5: Known bad inputs - SQL injection, XSS, etc.
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 5,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `BadInputsRuleSet-${props.environment}`,
          },
        },
        // Rule 6: Bot control - Detect and block automated traffic
        {
          name: 'BotControlRule',
          priority: 6,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesBotControlRuleSet',
              managedRuleGroupConfigs: [
                {
                  awsManagedRulesBotControlRuleSet: {
                    inspectionLevel: 'COMMON', // COMMON or TARGETED
                  },
                },
              ],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `BotControl-${props.environment}`,
          },
        },
        // Rule 7: Geo-blocking (optional - can be configured based on requirements)
        // Uncomment and configure if specific geographic restrictions are needed
        /*
        {
          name: 'GeoBlockingRule',
          priority: 7,
          statement: {
            notStatement: {
              statement: {
                geoMatchStatement: {
                  countryCodes: ['US', 'CA', 'GB', 'EU'], // Allowed countries
                },
              },
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `GeoBlocking-${props.environment}`,
          },
        },
        */
      ],
    });

    // Configure WAF logging to S3
    new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [
        `arn:aws:s3:::${this.wafLogBucket.bucketName}`,
      ],
      loggingFilter: {
        defaultBehavior: 'KEEP',
        filters: [
          {
            behavior: 'KEEP',
            conditions: [
              {
                actionCondition: {
                  action: 'BLOCK',
                },
              },
            ],
            requirement: 'MEETS_ANY',
          },
          {
            behavior: 'KEEP',
            conditions: [
              {
                actionCondition: {
                  action: 'CAPTCHA',
                },
              },
            ],
            requirement: 'MEETS_ANY',
          },
        ],
      },
      redactedFields: [
        {
          singleHeader: {
            name: 'authorization',
          },
        },
        {
          singleHeader: {
            name: 'cookie',
          },
        },
      ],
    });

    // Output secret ARNs and resource identifiers for reference
    new cdk.CfnOutput(this, 'JwtSecretArn', {
      value: this.jwtSecret.secretArn,
      description: 'JWT Secret ARN (rotates every 90 days)',
      exportName: `${props.environment}-JwtSecretArn`,
    });

    new cdk.CfnOutput(this, 'BlockfrostSecretArn', {
      value: this.blockfrostSecret.secretArn,
      description: 'Blockfrost API Secret ARN',
      exportName: `${props.environment}-BlockfrostSecretArn`,
    });

    new cdk.CfnOutput(this, 'IpfsSecretArn', {
      value: this.ipfsSecret.secretArn,
      description: 'IPFS API Secret ARN',
      exportName: `${props.environment}-IpfsSecretArn`,
    });

    new cdk.CfnOutput(this, 'PolicySigningKeySecretArn', {
      value: this.policySigningKeySecret.secretArn,
      description: 'Policy Signing Key Secret ARN (rotates every 90 days)',
      exportName: `${props.environment}-PolicySigningKeySecretArn`,
    });

    new cdk.CfnOutput(this, 'WebAclArn', {
      value: this.webAcl.attrArn,
      description: 'WAF WebACL ARN for CloudFront distribution',
      exportName: `${props.environment}-WebAclArn`,
    });

    new cdk.CfnOutput(this, 'WafLogBucketName', {
      value: this.wafLogBucket.bucketName,
      description: 'S3 bucket for WAF logs',
      exportName: `${props.environment}-WafLogBucketName`,
    });

    new cdk.CfnOutput(this, 'SecretsAccessPolicyArn', {
      value: this.secretsAccessPolicy.managedPolicyArn,
      description: 'IAM policy ARN for Lambda functions to access secrets',
      exportName: `${props.environment}-SecretsAccessPolicyArn`,
    });
  }
}
