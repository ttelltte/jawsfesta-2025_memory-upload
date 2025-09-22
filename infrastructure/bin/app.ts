#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemoryUploadStack } from '../lib/stacks/memory-upload-stack';
import * as fs from 'fs';
import * as path from 'path';

const app = new cdk.App();

// 環境の取得（デフォルトは dev）
const environment = app.node.tryGetContext('environment') || 'dev';

// 設定ファイルの読み込み
const configPath = path.join(__dirname, '../../config', `${environment}.json`);
let config: any = {};

try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn(`Configuration file not found: ${configPath}`);
    console.warn('Using default configuration values');
  }
} catch (error) {
  console.error(`Error reading configuration file: ${configPath}`, error);
  process.exit(1);
}

// スタック名の生成
const stackName = config.stackName || `JawsFestaMemoryUpload${environment.charAt(0).toUpperCase() + environment.slice(1)}`;

// CDK環境の設定
const env: cdk.Environment = {
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region || process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

// スタックの作成
new MemoryUploadStack(app, stackName, {
  env,
  config,
  environment,
  description: `JAWS FESTA Memory Upload Stack for ${environment} environment`,
  tags: {
    ...config.tags,
    Environment: environment,
    StackName: stackName,
  },
});

// CDK メタデータの追加
cdk.Tags.of(app).add('Project', 'JawsFestaMemoryUpload');
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');