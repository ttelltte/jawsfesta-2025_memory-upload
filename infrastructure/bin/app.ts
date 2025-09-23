#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemoryUploadStack } from '../lib/stacks/memory-upload-stack';
import * as fs from 'fs';
import * as path from 'path';

const app = new cdk.App();

// 環境の取得（デフォルトは dev）
const environment = app.node.tryGetContext('environment') || 'dev';

console.log(`🚀 Initializing JAWS FESTA Memory Upload CDK App`);
console.log(`📋 Environment: ${environment}`);

// CDKコンテキストから環境別設定を取得
const contextConfig = app.node.tryGetContext(environment) || {};

// 設定ファイルの読み込み
const configPath = path.join(__dirname, '../../config', `${environment}.json`);
let config: any = {};

try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`✅ Configuration loaded from: ${configPath}`);
  } else {
    console.warn(`⚠️  Configuration file not found: ${configPath}`);
    console.warn('Using default configuration values');
  }
} catch (error) {
  console.error(`❌ Error reading configuration file: ${configPath}`, error);
  process.exit(1);
}

// コンテキスト設定とファイル設定をマージ
const mergedConfig = {
  ...config,
  ...contextConfig,
};

// AWS プロファイルの設定
const awsProfile = mergedConfig.profile ||
  app.node.tryGetContext('aws-profile') ||
  process.env.AWS_PROFILE ||
  (environment === 'prod' ? 'prod' : 'default');

// AWS リージョンの設定
const awsRegion = mergedConfig.region ||
  app.node.tryGetContext('aws-region') ||
  process.env.AWS_REGION ||
  process.env.CDK_DEFAULT_REGION ||
  'ap-northeast-1';

// AWS アカウントIDの設定
const awsAccount = mergedConfig.account ||
  app.node.tryGetContext('aws-account') ||
  process.env.CDK_DEFAULT_ACCOUNT;

console.log(`🔧 AWS Profile: ${awsProfile}`);
console.log(`🌏 AWS Region: ${awsRegion}`);
if (awsAccount) {
  console.log(`🏢 AWS Account: ${awsAccount}`);
}

// スタック名の生成（環境とプロジェクト名を含む）
const projectName = app.node.tryGetContext('project-name') || 'JawsFestaMemoryUpload';
const stackName = mergedConfig.stackName ||
  `${projectName}${environment.charAt(0).toUpperCase() + environment.slice(1)}Stack`;

console.log(`📦 Stack Name: ${stackName}`);

// CDK環境の設定
const env: cdk.Environment = {
  account: awsAccount,
  region: awsRegion,
};

// 環境変数の設定（Lambda関数で使用）
process.env.AWS_PROFILE = awsProfile;
process.env.AWS_REGION = awsRegion;

// スタックの作成
const stack = new MemoryUploadStack(app, stackName, {
  env,
  config: mergedConfig,
  environment,
  description: `JAWS FESTA Memory Upload Stack for ${environment} environment (Profile: ${awsProfile})`,
  tags: {
    ...mergedConfig.tags,
    Environment: environment,
    StackName: stackName,
    Project: projectName,
    ManagedBy: 'AWS-CDK',
    DeployedBy: awsProfile,
    DeployedAt: new Date().toISOString(),
  },
});

// 追加のタグ設定
cdk.Tags.of(app).add('Project', projectName);
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('Repository', 'jaws-festa-memory-upload');

// 環境別の追加設定
if (environment === 'prod') {
  // 本番環境の場合の追加設定
  cdk.Tags.of(app).add('CostCenter', mergedConfig.costCenter || 'JAWS-FESTA');
  cdk.Tags.of(app).add('Owner', mergedConfig.owner || 'JAWS-UG');

  // 本番環境では削除保護を有効化
  cdk.Tags.of(app).add('DeletionPolicy', 'Retain');
} else {
  // 開発環境の場合の追加設定
  cdk.Tags.of(app).add('AutoDelete', 'true');
  cdk.Tags.of(app).add('Developer', process.env.USER || process.env.USERNAME || 'unknown');
}

console.log(`✅ CDK App initialized successfully`);
console.log(`🎯 Ready to deploy stack: ${stackName}`);