import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface MemoryUploadStackProps extends cdk.StackProps {
  config: any;
  environment: string;
}

export class MemoryUploadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MemoryUploadStackProps) {
    super(scope, id, props);

    const { config, environment } = props;

    // TODO: リソースの実装は後続のタスクで行います
    // この段階では基本的なスタック構造のみを作成

    // スタック情報の出力
    new cdk.CfnOutput(this, 'StackName', {
      value: this.stackName,
      description: 'Name of the CloudFormation stack',
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'Deployment environment',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}