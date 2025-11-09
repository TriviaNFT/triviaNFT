import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface TriviaNftLambdaProps {
  functionName: string;
  handler: string;
  code: lambda.Code;
  environment?: { [key: string]: string };
  vpc?: ec2.IVpc;
  securityGroups?: ec2.ISecurityGroup[];
  timeout?: cdk.Duration;
  memorySize?: number;
  reservedConcurrentExecutions?: number;
  secrets?: secretsmanager.ISecret[];
  layers?: lambda.ILayerVersion[];
}

/**
 * Reusable construct for creating Lambda functions with common configuration
 */
export class TriviaNftLambda extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: TriviaNftLambdaProps) {
    super(scope, id);

    // Create Lambda function with common configuration
    this.function = new lambda.Function(this, 'Function', {
      functionName: props.functionName,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: props.handler,
      code: props.code,
      environment: {
        NODE_ENV: 'production',
        ...props.environment,
      },
      vpc: props.vpc,
      vpcSubnets: props.vpc
        ? {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          }
        : undefined,
      securityGroups: props.securityGroups,
      timeout: props.timeout || cdk.Duration.seconds(30),
      memorySize: props.memorySize || 512,
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      layers: props.layers,
      tracing: lambda.Tracing.ACTIVE,
      architecture: lambda.Architecture.ARM_64,
      logRetention: 30,
    });

    // Grant read access to secrets
    if (props.secrets) {
      props.secrets.forEach((secret) => {
        secret.grantRead(this.function);
      });
    }

    // Add X-Ray permissions
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'],
      })
    );
  }

  /**
   * Grant the Lambda function permission to invoke a Step Functions state machine
   */
  public grantStartExecution(stateMachineArn: string): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [stateMachineArn],
      })
    );
  }

  /**
   * Grant the Lambda function permission to describe Step Functions executions
   */
  public grantDescribeExecution(stateMachineArn: string): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:DescribeExecution'],
        resources: [`${stateMachineArn.replace(':stateMachine:', ':execution:')}:*`],
      })
    );
  }
}
