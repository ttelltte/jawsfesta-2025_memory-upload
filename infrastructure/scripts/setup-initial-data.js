#!/usr/bin/env node

/**
 * DynamoDB Config テーブルに初期データを投入するスクリプト
 * 
 * 使用方法:
 * node setup-initial-data.js [環境名]
 * 
 * 例:
 * node setup-initial-data.js dev
 * node setup-initial-data.js prod
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

// 環境名を取得（デフォルトは dev）
const environment = process.argv[2] || 'dev';

// 設定ファイルを読み込み
const configPath = path.join(__dirname, '..', '..', 'config', `${environment}.json`);
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`❌ 設定ファイルが見つかりません: ${configPath}`);
  console.error('利用可能な環境: dev, prod');
  process.exit(1);
}

// DynamoDB クライアントを初期化
const client = new DynamoDBClient({
  region: config.region || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(client);

// 初期データを読み込み
const initialDataPath = path.join(__dirname, 'initial-config-data.json');
let initialData;

try {
  initialData = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
} catch (error) {
  console.error(`❌ 初期データファイルが見つかりません: ${initialDataPath}`);
  process.exit(1);
}

/**
 * CDK出力からテーブル名を取得
 */
async function getTableName(environment) {
  const { execSync } = require('child_process');
  
  try {
    // CDK出力からテーブル名を取得
    const stackName = environment === 'dev' ? 'JawsFestaMemoryUploadDev' : 'JawsFestaMemoryUploadProd';
    const command = `npx cdk list --context environment=${environment} --json`;
    
    // 直接AWS CLIでスタック出力を取得
    const outputCommand = `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[?OutputKey=='ConfigTableName'].OutputValue" --output text --region ap-northeast-1`;
    const tableName = execSync(outputCommand, { encoding: 'utf8' }).trim();
    
    if (!tableName || tableName === 'None') {
      throw new Error(`ConfigTableName output not found in stack ${stackName}`);
    }
    
    return tableName;
  } catch (error) {
    console.error('❌ CDK出力からテーブル名を取得できませんでした。');
    console.error('デプロイ出力から手動でテーブル名を使用します...');
    
    // フォールバック: デプロイ出力から取得した実際のテーブル名
    return environment === 'dev' 
      ? 'JawsFestaMemoryUploadDev-ConfigTable5CD72349-NHGDDZSNQTN3'
      : `JawsFestaMemoryUploadProd-ConfigTable-${environment}`;
  }
}

/**
 * Config テーブルに初期データを投入
 */
async function setupInitialData() {
  const tableName = await getTableName(environment);
  
  console.log(`🚀 ${environment} 環境の Config テーブルに初期データを投入します...`);
  console.log(`📋 テーブル名: ${tableName}`);
  
  try {
    // 既存データの確認
    console.log('📖 既存データを確認中...');
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        PK: initialData.PK,
        SK: initialData.SK
      }
    });
    
    const existingData = await docClient.send(getCommand);
    
    if (existingData.Item) {
      console.log('⚠️  既存の設定データが見つかりました。');
      console.log('現在の確認項目:');
      existingData.Item.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.text}`);
      });
      
      // 上書き確認（本来はプロンプトライブラリを使用するが、シンプルに実装）
      console.log('');
      console.log('💡 既存データを上書きする場合は、--force オプションを使用してください:');
      console.log(`   node setup-initial-data.js ${environment} --force`);
      
      if (!process.argv.includes('--force')) {
        console.log('✅ 初期データ投入をスキップしました。');
        return;
      }
      
      console.log('🔄 既存データを上書きします...');
    }
    
    // 現在のタイムスタンプで更新
    const dataToInsert = {
      ...initialData,
      updatedAt: Date.now()
    };
    
    // データを投入
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: dataToInsert
    });
    
    await docClient.send(putCommand);
    
    console.log('✅ 初期データの投入が完了しました！');
    console.log('');
    console.log('📋 投入された確認項目:');
    dataToInsert.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.text}`);
    });
    
  } catch (error) {
    console.error('❌ 初期データの投入に失敗しました:');
    
    if (error.name === 'ResourceNotFoundException') {
      console.error(`テーブル '${tableName}' が見つかりません。`);
      console.error('CDK デプロイが完了していることを確認してください。');
    } else if (error.name === 'UnrecognizedClientException') {
      console.error('AWS 認証情報が正しく設定されていません。');
      console.error('AWS CLI の設定を確認してください。');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

/**
 * 設定データの確認
 */
async function showCurrentConfig() {
  const tableName = await getTableName(environment);
  
  console.log(`📋 ${environment} 環境の現在の設定を表示します...`);
  
  try {
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        PK: 'CONFIG',
        SK: 'UPLOAD_CHECKLIST'
      }
    });
    
    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      console.log('⚠️  設定データが見つかりません。');
      console.log('初期データを投入してください:');
      console.log(`   node setup-initial-data.js ${environment}`);
      return;
    }
    
    console.log('✅ 現在の確認項目:');
    result.Item.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.text} (必須: ${item.required ? 'はい' : 'いいえ'})`);
    });
    
    const updatedDate = new Date(result.Item.updatedAt);
    console.log(`📅 最終更新: ${updatedDate.toLocaleString('ja-JP')}`);
    
  } catch (error) {
    console.error('❌ 設定の取得に失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  if (process.argv.includes('--show')) {
    await showCurrentConfig();
  } else {
    await setupInitialData();
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  setupInitialData,
  showCurrentConfig
};