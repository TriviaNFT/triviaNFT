import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LambdaLayersProps {
  environment: 'staging' | 'production';
}

/**
 * Construct for creating Lambda layers with shared dependencies
 */
export class LambdaLayers extends Construct {
  public readonly dependenciesLayer: lambda.LayerVersion;
  public readonly sharedUtilsLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LambdaLayersProps) {
    super(scope, id);

    // Layer 1: Node.js dependencies (AWS SDK, Lucid, pg, redis, etc.)
    this.dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      layerVersionName: `trivia-nft-dependencies-${props.environment}`,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../services/api/layer')
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: 'Node.js dependencies for TriviaNFT API (AWS SDK, database clients, etc.)',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Layer 2: Shared utilities from packages/shared
    this.sharedUtilsLayer = new lambda.LayerVersion(this, 'SharedUtilsLayer', {
      layerVersionName: `trivia-nft-shared-utils-${props.environment}`,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../packages/shared/dist'),
        {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            command: [
              'bash',
              '-c',
              [
                'mkdir -p /asset-output/nodejs/node_modules/@trivia-nft/shared',
                'cp -r /asset-input/* /asset-output/nodejs/node_modules/@trivia-nft/shared/',
              ].join(' && '),
            ],
            local: {
              tryBundle(outputDir: string) {
                try {
                  const sharedDistDir = path.resolve(__dirname, '../../../packages/shared/dist');
                  const targetDir = path.join(outputDir, 'nodejs/node_modules/@trivia-nft/shared');
                  
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
                  
                  // Copy shared dist to layer structure
                  copyDir(sharedDistDir, targetDir);
                  
                  return true;
                } catch (error) {
                  console.error('Local bundling failed for SharedUtilsLayer:', error);
                  return false;
                }
              },
            },
          },
        }
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: 'Shared utilities and types for TriviaNFT API',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DependenciesLayerArn', {
      value: this.dependenciesLayer.layerVersionArn,
      description: 'ARN of the dependencies Lambda layer',
      exportName: `${props.environment}-DependenciesLayerArn`,
    });

    new cdk.CfnOutput(this, 'SharedUtilsLayerArn', {
      value: this.sharedUtilsLayer.layerVersionArn,
      description: 'ARN of the shared utilities Lambda layer',
      exportName: `${props.environment}-SharedUtilsLayerArn`,
    });
  }
}
