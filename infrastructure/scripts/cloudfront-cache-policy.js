#!/usr/bin/env node

/**
 * CloudFrontのキャッシュポリシーを最適化するためのヘルパースクリプト
 * 
 * 使用方法:
 * node cloudfront-cache-policy.js [環境名] [アクション]
 * 
 * アクション:
 * - invalidate: キャッシュを無効化
 * - status: 無効化の状況を確認
 * 
 * 例:
 * node cloudfront-cache-policy.js dev invalidate
 * node cloudfront-cache-policy.js prod status
 */

const { CloudFrontClient, CreateInvalidationCommand, GetInvalidationCommand, ListInvalidationsCommand } = require('@aws-sdk/client-cloudfront');
const fs = require('fs');
const path = require('path');

// 引数の解析
const environment = process.argv[2] || 'dev';
const action = process.argv[3] || 'invalidate';

// 環境設定ファイルを読み込み
const configPath = path.join(__dirname, '..', '..', 'config', `${environment}.json`);
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`❌ 設定ファイルが見つかりません: ${configPath}`);
  console.error('利用可能な環境: dev, prod');
  process.exit(1);
}

// CloudFront クライアントを初期化
const cloudFrontClient = new CloudFrontClient({
  region: config.region || 'ap-northeast-1'
});

/**
 * キャッシュを無効化
 */
async function invalidateCache() {
  console.log('🔄 CloudFrontキャッシュを無効化中...');
  
  try {
    const distributionId = config.cloudFrontDistributionId;
    
    if (!distributionId) {
      console.error('❌ CloudFront Distribution ID が設定されていません。');
      console.error('config.json に cloudFrontDistributionId を設定してください。');
      process.exit(1);
    }
    
    // 無効化パスを指定
    const paths = process.argv.slice(4);
    const invalidationPaths = paths.length > 0 ? paths : ['/*'];
    
    console.log(`📋 無効化対象: ${invalidationPaths.join(', ')}`);
    
    const invalidationCommand = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: invalidationPaths.length,
          Items: invalidationPaths,
        },
        CallerReference: `manual-invalidation-${Date.now()}`,
      },
    });
    
    const response = await cloudFrontClient.send(invalidationCommand);
    
    console.log('✅ CloudFrontキャッシュの無効化を開始しました。');
    console.log(`📋 無効化ID: ${response.Invalidation?.Id}`);
    console.log(`📋 ステータス: ${response.Invalidation?.Status}`);
    console.log('⏳ 無効化の完了まで数分かかる場合があります。');
    
    // ステータス確認のコマンドを表示
    console.log('');
    console.log('💡 ステータス確認:');
    console.log(`   node cloudfront-cache-policy.js ${environment} status ${response.Invalidation?.Id}`);
    
  } catch (error) {
    console.error('❌ CloudFrontキャッシュの無効化に失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 無効化のステータスを確認
 */
async function checkInvalidationStatus() {
  console.log('📊 CloudFront無効化のステータスを確認中...');
  
  try {
    const distributionId = config.cloudFrontDistributionId;
    
    if (!distributionId) {
      console.error('❌ CloudFront Distribution ID が設定されていません。');
      process.exit(1);
    }
    
    const invalidationId = process.argv[4];
    
    if (invalidationId) {
      // 特定の無効化IDのステータスを確認
      const getCommand = new GetInvalidationCommand({
        DistributionId: distributionId,
        Id: invalidationId,
      });
      
      const response = await cloudFrontClient.send(getCommand);
      
      console.log('📋 無効化情報:');
      console.log(`   ID: ${response.Invalidation?.Id}`);
      console.log(`   ステータス: ${response.Invalidation?.Status}`);
      console.log(`   作成日時: ${response.Invalidation?.CreateTime}`);
      console.log(`   対象パス: ${response.Invalidation?.InvalidationBatch?.Paths?.Items?.join(', ')}`);
      
    } else {
      // 最近の無効化一覧を表示
      const listCommand = new ListInvalidationsCommand({
        DistributionId: distributionId,
        MaxItems: 10,
      });
      
      const response = await cloudFrontClient.send(listCommand);
      
      console.log('📋 最近の無効化一覧:');
      
      if (!response.InvalidationList?.Items || response.InvalidationList.Items.length === 0) {
        console.log('   無効化履歴がありません。');
        return;
      }
      
      response.InvalidationList.Items.forEach((invalidation, index) => {
        console.log(`   ${index + 1}. ID: ${invalidation.Id}`);
        console.log(`      ステータス: ${invalidation.Status}`);
        console.log(`      作成日時: ${invalidation.CreateTime}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ ステータスの確認に失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * キャッシュ最適化のヒントを表示
 */
function showCacheOptimizationTips() {
  console.log('💡 CloudFrontキャッシュ最適化のヒント:');
  console.log('');
  console.log('📁 ファイル別キャッシュ戦略:');
  console.log('   • index.html: キャッシュしない (no-cache)');
  console.log('   • JS/CSS (ハッシュ付き): 長期キャッシュ (1年)');
  console.log('   • 画像ファイル: 中期キャッシュ (30日)');
  console.log('   • API レスポンス: キャッシュしない');
  console.log('');
  console.log('🔄 無効化のベストプラクティス:');
  console.log('   • 必要最小限のパスのみ無効化');
  console.log('   • index.html は毎回無効化');
  console.log('   • ハッシュ付きファイルは無効化不要');
  console.log('');
  console.log('⚡ パフォーマンス向上:');
  console.log('   • Gzip圧縮の有効化');
  console.log('   • HTTP/2 の使用');
  console.log('   • 適切なCache-Controlヘッダー');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🌐 CloudFrontキャッシュ管理スクリプト');
  console.log(`環境: ${environment}`);
  console.log(`アクション: ${action}`);
  console.log('');
  
  try {
    switch (action) {
      case 'invalidate':
        await invalidateCache();
        break;
        
      case 'status':
        await checkInvalidationStatus();
        break;
        
      case 'tips':
        showCacheOptimizationTips();
        break;
        
      default:
        console.error(`❌ 不明なアクション: ${action}`);
        console.error('利用可能なアクション: invalidate, status, tips');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 処理に失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  invalidateCache,
  checkInvalidationStatus,
  showCacheOptimizationTips,
};