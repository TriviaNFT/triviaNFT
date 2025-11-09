import * as cdk from 'aws-cdk-lib';
import * as appconfig from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfigStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
}

export class AppConfigStack extends cdk.Stack {
  public readonly application: appconfig.CfnApplication;
  public readonly appConfigEnvironment: appconfig.CfnEnvironment;
  public readonly configurationProfile: appconfig.CfnConfigurationProfile;
  public readonly deploymentStrategy: appconfig.CfnDeploymentStrategy;

  constructor(scope: Construct, id: string, props: AppConfigStackProps) {
    super(scope, id, props);

    // Create AppConfig Application
    this.application = new appconfig.CfnApplication(this, 'Application', {
      name: `TriviaNFT-${props.environment}`,
      description: 'TriviaNFT game configuration parameters',
      tags: [
        {
          key: 'Project',
          value: 'TriviaNFT',
        },
        {
          key: 'Environment',
          value: props.environment,
        },
      ],
    });

    // Create AppConfig Environment
    this.appConfigEnvironment = new appconfig.CfnEnvironment(this, 'Environment', {
      applicationId: this.application.ref,
      name: props.environment,
      description: `${props.environment} environment for TriviaNFT`,
      tags: [
        {
          key: 'Project',
          value: 'TriviaNFT',
        },
        {
          key: 'Environment',
          value: props.environment,
        },
      ],
    });

    // Create custom deployment strategy for gradual rollout
    this.deploymentStrategy = new appconfig.CfnDeploymentStrategy(
      this,
      'DeploymentStrategy',
      {
        name: `TriviaNFT-GradualRollout-${props.environment}`,
        description: 'Gradual rollout with automatic rollback on alarms',
        deploymentDurationInMinutes: 10,
        growthFactor: 25, // 25% increments
        replicateTo: 'NONE',
        finalBakeTimeInMinutes: 5,
        growthType: 'LINEAR',
        tags: [
          {
            key: 'Project',
            value: 'TriviaNFT',
          },
          {
            key: 'Environment',
            value: props.environment,
          },
        ],
      }
    );

    // Load configuration schema and content
    const schemaPath = path.join(__dirname, '../config/game-settings-schema.json');
    const contentPath = path.join(__dirname, '../config/game-settings.json');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const content = fs.readFileSync(contentPath, 'utf-8');

    // Create Configuration Profile with JSON schema validation
    this.configurationProfile = new appconfig.CfnConfigurationProfile(
      this,
      'GameSettingsProfile',
      {
        applicationId: this.application.ref,
        name: 'game-settings',
        description: 'Game configuration parameters for TriviaNFT',
        locationUri: 'hosted',
        validators: [
          {
            type: 'JSON_SCHEMA',
            content: schema,
          },
        ],
        tags: [
          {
            key: 'Project',
            value: 'TriviaNFT',
          },
          {
            key: 'Environment',
            value: props.environment,
          },
        ],
      }
    );

    // Create Hosted Configuration Version with initial settings
    const hostedConfigVersion = new appconfig.CfnHostedConfigurationVersion(
      this,
      'InitialGameSettings',
      {
        applicationId: this.application.ref,
        configurationProfileId: this.configurationProfile.ref,
        content: content,
        contentType: 'application/json',
        description: 'Initial game settings configuration',
      }
    );

    // Deploy the configuration
    new appconfig.CfnDeployment(this, 'InitialDeployment', {
      applicationId: this.application.ref,
      environmentId: this.appConfigEnvironment.ref,
      configurationProfileId: this.configurationProfile.ref,
      configurationVersion: hostedConfigVersion.ref,
      deploymentStrategyId: this.deploymentStrategy.ref,
      description: 'Initial deployment of game settings',
      tags: [
        {
          key: 'Project',
          value: 'TriviaNFT',
        },
        {
          key: 'Environment',
          value: props.environment,
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApplicationId', {
      value: this.application.ref,
      description: 'AppConfig Application ID',
      exportName: `TriviaNFT-AppConfig-ApplicationId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'EnvironmentId', {
      value: this.appConfigEnvironment.ref,
      description: 'AppConfig Environment ID',
      exportName: `TriviaNFT-AppConfig-EnvironmentId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'ConfigurationProfileId', {
      value: this.configurationProfile.ref,
      description: 'AppConfig Configuration Profile ID',
      exportName: `TriviaNFT-AppConfig-ConfigurationProfileId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'DeploymentStrategyId', {
      value: this.deploymentStrategy.ref,
      description: 'AppConfig Deployment Strategy ID',
      exportName: `TriviaNFT-AppConfig-DeploymentStrategyId-${props.environment}`,
    });
  }
}
