#!/usr/bin/env node

/**
 * DynamoDB Config テーブルの設定を更新するスクリプト
 * 
 * 使用方法:
 * node update-config.js [環境名] [設定ファイルパス]
 * 
 * 例:
 * node update-config.js dev custom-config.json
 * node update-config.js prod production-config.json
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

// 引数の解析
const environment = process.argv[2] || 'dev';
const configFilePath = process.argv[3];

if (!configFilePath) {
  console.error('❌ 設定ファイルのパスを指定してください。');
  console.error('使用方法: node update-config.js [環境名] [設定ファイルパス]');
  console.error('例: node update-config.js dev my-config.json');
  process.exit(1);
}

// 環境設定ファイルを読み込み
const envConfigPath = path.join(__dirname, '..', '..', 'config', `${environment}.json`);
let envConfig;

try {
  envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
} catch (error) {
  console.error(`❌ 環境設定ファイルが見つかりません: ${envConfigPath}`);
  console.error('利用可能な環境: dev, prod');
  process.exit(1);
}

// カスタム設定ファイルを読み込み
const fullConfigPath = path.resolve(configFilePath);
let customConfig;

try {
  customConfig = JSON.parse(fs.readFileSync(fullConfigPath, 'utf8'));
} catch (error) {
  console.error(`❌ 設定ファイルが見つかりません: ${fullConfigPath}`);
  process.exit(1);
}

// 設定ファイルの形式を検証
function validateConfig(config) {
  if (!config.items || !Array.isArray(config.items)) {
    throw new Error('設定ファイルに "items" 配列が必要です。');
  }
  
  config.items.forEach((item, index) => {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`項目 ${index + 1}: "id" フィールドが必要です。`);
    }
    if (!item.text || typeof item.text !== 'string') {
      throw new Error(`項目 ${index + 1}: "text" フィールドが必要です。`);
    }
    if (typeof item.required !== 'boolean') {
      throw new Error(`項目 ${index + 1}: "required" フィールドは boolean である必要があります。`);
    }
  });
}

// DynamoDB クライアントを初期化
const client = new DynamoDBClient({
  region: envConfig.region || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * 設定を更新
 */
async function updateConfig() {
  const tableName = `MemoryUpload-${environment}-ConfigTable`;
  
  console.log(`🔄 ${environment} 環境の Config テーブルを更新します...`);
  console.log(`📋 テーブル名: ${tableName}`);
  console.log(`📄 設定ファイル: ${fullConfigPath}`);
  
  try {
    // 設定ファイルの検証
    console.log('🔍 設定ファイルを検証中...');
    validateConfig(customConfig);
    
    // 現在の設定を取得
    console.log('📖 現在の設定を取得中...');
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        PK: 'CONFIG',
        SK: 'UPLOAD_CHECKLIST'
      }
    });
    
    const currentData = await docClient.send(getCommand);
    
    if (currentData.Item) {
      console.log('📋 現在の確認項目:');
      currentData.Item.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.text}`);
      });
      console.log('');
    }
    
    // 新しい設定データを準備
    const newConfig = {
      PK: 'CONFIG',
      SK: 'UPLOAD_CHECKLIST',
      items: customConfig.items,
      updatedAt: Date.now()
    };
    
    console.log('📋 新しい確認項目:');
    newConfig.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.text} (必須: ${item.required ? 'はい' : 'いいえ'})`);
    });
    
    // 確認プロンプト（--force オプションがない場合）
    if (!process.argv.includes('--force')) {
      console.log('');
      console.log('⚠️  上記の設定で更新します。続行しますか？');
      console.log('続行する場合は --force オプションを追加してください:');
      console.log(`   node update-config.js ${environment} ${configFilePath} --force`);
      return;
    }
    
    // 設定を更新
    console.log('💾 設定を更新中...');
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: newConfig
    });
    
    await docClient.send(putCommand);
    
    console.log('✅ 設定の更新が完了しました！');
    
    const updatedDate = new Date(newConfig.updatedAt);
    console.log(`📅 更新日時: ${updatedDate.toLocaleString('ja-JP')}`);
    
  } catch (error) {
    console.error('❌ 設定の更新に失敗しました:');
    
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
 * 設定ファイルのテンプレートを生成
 */
function generateTemplate() {
  const template = {
    items: [
      {
        id: "event_participant",
        text: "イベント参加者であることを確認しました",
        required: true
      },
      {
        id: "appropriate_content",
        text: "JAWS-UG行動規範に沿った内容であることを確認しました",
        required: true
      },
      {
        id: "public_sharing",
        text: "写真がパブリックに公開されることを理解しました",
        required: true
      },
      {
        id: "auto_deletion",
        text: "30日後に自動的に削除されることを理解しました",
        required: true
      }
    ]
  };
  
  const templatePath = path.join(__dirname, 'config-template.json');
  fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  
  console.log('✅ 設定ファイルのテンプレートを生成しました:');
  console.log(`📄 ${templatePath}`);
  console.log('');
  console.log('このファイルを編集して、update-config.js で使用してください。');
}

// メイン処理
async function main() {
  if (process.argv.includes('--template')) {
    generateTemplate();
  } else {
    await updateConfig();
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateConfig,
  generateTemplate,
  validateConfig
};