import {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewayAuthorizerResult,
  Context,
} from 'aws-lambda';
import { verifyJWT } from '../../utils/jwt.js';

/**
 * JWT Authorizer Lambda for API Gateway
 * Validates JWT tokens and returns IAM policy
 */
export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2,
  _context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer invoked', { event });

  try {
    // Extract token from Authorization header
    const token = event.headers?.authorization?.replace('Bearer ', '') || '';

    if (!token) {
      throw new Error('No token provided');
    }

    // Verify JWT token
    const payload = await verifyJWT(token);

    // Generate IAM policy
    return generatePolicy(payload.sub, 'Allow', event.routeArn, {
      stakeKey: payload.stakeKey || '',
      username: payload.username || '',
    });
  } catch (error) {
    console.error('Authorization failed', { error });
    // Return Deny policy
    return generatePolicy('user', 'Deny', event.routeArn);
  }
};

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}
