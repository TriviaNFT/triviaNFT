/**
 * Lambda Function for Database Migrations
 * 
 * This Lambda function is triggered during CDK deployment to run database migrations.
 * It uses AWS Secrets Manager to retrieve database credentials.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { runMigrations } from './migrate.js';

interface DatabaseSecret {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
}

interface MigrationEvent {
  action: 'migrate' | 'rollback';
  secretArn?: string;
  databaseUrl?: string;
}

interface MigrationResponse {
  statusCode: number;
  body: string;
}

/**
 * Get database credentials from Secrets Manager
 */
async function getDatabaseCredentials(secretArn: string): Promise<string> {
  const client = new SecretsManagerClient({});
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretArn,
      })
    );

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const secret: DatabaseSecret = JSON.parse(response.SecretString);
    
    // Construct database URL
    const databaseUrl = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.dbname}?sslmode=require`;
    
    return databaseUrl;
  } catch (error) {
    console.error('Error retrieving database credentials:', error);
    throw error;
  }
}

/**
 * Lambda handler
 */
export async function handler(event: MigrationEvent): Promise<MigrationResponse> {
  console.log('Migration Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    // Get database URL from event or Secrets Manager
    let databaseUrl: string;
    
    if (event.databaseUrl) {
      databaseUrl = event.databaseUrl;
    } else if (event.secretArn) {
      databaseUrl = await getDatabaseCredentials(event.secretArn);
    } else {
      throw new Error('Either databaseUrl or secretArn must be provided');
    }

    // Run migrations
    const result = await runMigrations(databaseUrl);

    if (result.success) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Migrations completed successfully',
          migrationsRun: result.migrationsRun,
        }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Migration failed',
          error: result.error,
          migrationsRun: result.migrationsRun,
        }),
      };
    }
  } catch (error) {
    console.error('Lambda execution error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Lambda execution failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
