import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiEndpointProps {
  api: apigateway.CfnApi;
  routeKey: string;
  lambdaFunction: lambda.IFunction;
  authorizerId?: string;
}

/**
 * Reusable construct for creating API Gateway routes with Lambda integrations
 */
export class ApiEndpoint extends Construct {
  public readonly route: apigateway.CfnRoute;
  public readonly integration: apigateway.CfnIntegration;

  constructor(scope: Construct, id: string, props: ApiEndpointProps) {
    super(scope, id);

    // Create Lambda integration
    this.integration = new apigateway.CfnIntegration(this, 'Integration', {
      apiId: props.api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: props.lambdaFunction.functionArn,
      integrationMethod: 'POST',
      payloadFormatVersion: '2.0',
    });

    // Create route
    this.route = new apigateway.CfnRoute(this, 'Route', {
      apiId: props.api.ref,
      routeKey: props.routeKey,
      target: `integrations/${this.integration.ref}`,
      authorizationType: props.authorizerId ? 'CUSTOM' : 'NONE',
      authorizerId: props.authorizerId,
    });

    // Grant API Gateway permission to invoke Lambda
    props.lambdaFunction.addPermission(`ApiGatewayInvoke-${id}`, {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${cdk.Stack.of(this).region}:${
        cdk.Stack.of(this).account
      }:${props.api.ref}/*/*`,
    });
  }
}
