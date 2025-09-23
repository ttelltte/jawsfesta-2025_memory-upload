#!/usr/bin/env node

/**
 * フロントエンドをビルドしてS3にデプロイするスクリプト
 * 
 * 使用方法:
 * node deploy-frontend.js [環境名]
 * 
 * 例:
 * node deploy-frontend.js dev
 * node deploy-frontend.js prod
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mime = require('mime-types');

// 引数の解析
const environment = process.argv[2] || 'dev';

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

// AWS クライアントを初期化
const s3Client = new S3Client({
  region: config.region || 'ap-northeast-1'
});

const cloudFrontClient = new CloudFrontClient({
  region: config.region || 'ap-northeast-1'
});

// 設定
const BUCKET_NAME = environment === 'dev' 
  ? 'jawsfestamemoryuploaddev-photosbucket2ac9d1f0-dsxgalzcz168'
  : `jawsfestamemoryuploadprod-photosbucket-${environment}`;
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');

/**
 * フロントエンドをビルド
 */
async function buildFrontend() {
  console.log('🔨 フロントエンドをビルド中...');
  
  try {
    // 環境変数を設定してビルド
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      VITE_ENVIRONMENT: environment,
    };
    
    // CDK出力から実際のURLを取得する場合の処理（将来の拡張用）
    if (config.apiGatewayUrl) {
      env.VITE_API_URL = config.apiGatewayUrl;
    }
    if (config.cloudFrontUrl) {
      env.VITE_CLOUDFRONT_URL = config.cloudFrontUrl;
    }
    
    // npm install（必要に応じて）
    console.log('📦 依存関係を確認中...');
    execSync('npm ci', { 
      cwd: FRONTEND_DIR, 
      stdio: 'inherit',
      env 
    });
    
    // ビルド実行
    console.log('⚡ Vite ビルドを実行中...');
    execSync('npm run build', { 
      cwd: FRONTEND_DIR, 
      stdio: 'inherit',
      env 
    });
    
    console.log('✅ フロントエンドのビルドが完了しました。');
    
  } catch (error) {
    console.error('❌ フロントエンドのビルドに失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * ディレクトリ内のファイルを再帰的に取得
 */
function getFilesRecursively(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        localPath: fullPath,
        s3Key: relativePath.replace(/\\/g, '/'), // Windows対応
      });
    }
  }
  
  return files;
}

/**
 * S3バケットの既存ファイルをクリア（images/フォルダは除外）
 */
async function clearS3Bucket() {
  console.log('🗑️  S3バケットの既存ファイルをクリア中...');
  
  try {
    // 既存オブジェクトの一覧を取得
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: '', // 全てのオブジェクト
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('📭 S3バケットは既に空です。');
      return;
    }
    
    // images/フォルダ以外のオブジェクトをフィルタリング
    const objectsToDelete = listResponse.Contents.filter(object => {
      return object.Key && !object.Key.startsWith('images/');
    });
    
    if (objectsToDelete.length === 0) {
      console.log('📭 削除対象のファイルはありません（images/フォルダは保持）。');
      return;
    }
    
    // オブジェクトを削除
    console.log(`🗑️  ${objectsToDelete.length} 個のファイルを削除中...`);
    
    for (const object of objectsToDelete) {
      if (object.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key,
        });
        
        await s3Client.send(deleteCommand);
        console.log(`   削除: ${object.Key}`);
      }
    }
    
    // 保持されたimages/ファイルの数を表示
    const imagesCount = listResponse.Contents.length - objectsToDelete.length;
    if (imagesCount > 0) {
      console.log(`📷 images/フォルダ内の ${imagesCount} 個のファイルを保持しました。`);
    }
    
    console.log('✅ S3バケットのクリアが完了しました。');
    
  } catch (error) {
    console.error('❌ S3バケットのクリアに失敗しました:');
    
    if (error.name === 'NoSuchBucket') {
      console.error(`バケット '${BUCKET_NAME}' が見つかりません。`);
      console.error('CDK デプロイが完了していることを確認してください。');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

/**
 * ファイルをS3にアップロード
 */
async function uploadToS3() {
  console.log('☁️  S3にファイルをアップロード中...');
  
  try {
    // ビルドされたファイルの一覧を取得
    const files = getFilesRecursively(DIST_DIR);
    
    if (files.length === 0) {
      console.error('❌ ビルドされたファイルが見つかりません。');
      console.error('先にフロントエンドをビルドしてください。');
      process.exit(1);
    }
    
    console.log(`📁 ${files.length} 個のファイルをアップロード中...`);
    
    // 各ファイルをアップロード
    for (const file of files) {
      const fileContent = fs.readFileSync(file.localPath);
      const contentType = mime.lookup(file.localPath) || 'application/octet-stream';
      
      // キャッシュ設定
      let cacheControl = 'public, max-age=31536000'; // 1年（デフォルト）
      
      if (file.s3Key === 'index.html') {
        // index.htmlはキャッシュしない
        cacheControl = 'no-cache, no-store, must-revalidate';
      } else if (file.s3Key.match(/\.(js|css)$/)) {
        // JS/CSSファイルは長期キャッシュ（ハッシュ付きファイル名のため）
        cacheControl = 'public, max-age=31536000, immutable';
      } else if (file.s3Key.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
        // 画像ファイルは中期キャッシュ
        cacheControl = 'public, max-age=2592000'; // 30日
      }
      
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.s3Key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: cacheControl,
        
        // セキュリティヘッダー（index.htmlのみ）
        ...(file.s3Key === 'index.html' && {
          Metadata: {
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'x-xss-protection': '1; mode=block',
          },
        }),
      });
      
      await s3Client.send(putCommand);
      console.log(`   アップロード: ${file.s3Key} (${contentType})`);
    }
    
    console.log('✅ S3へのアップロードが完了しました。');
    
  } catch (error) {
    console.error('❌ S3へのアップロードに失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * CloudFrontキャッシュを無効化
 */
async function invalidateCloudFront() {
  console.log('🔄 CloudFrontキャッシュを無効化中...');
  
  try {
    // CDK出力からDistribution IDを取得する必要があるが、
    // 簡単のため設定ファイルから取得
    const distributionId = config.cloudFrontDistributionId;
    
    if (!distributionId) {
      console.log('⚠️  CloudFront Distribution ID が設定されていません。');
      console.log('手動でキャッシュを無効化してください。');
      return;
    }
    
    const invalidationCommand = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: 2,
          Items: ['/*', '/index.html'],
        },
        CallerReference: `deploy-${Date.now()}`,
      },
    });
    
    const response = await cloudFrontClient.send(invalidationCommand);
    
    console.log('✅ CloudFrontキャッシュの無効化を開始しました。');
    console.log(`📋 無効化ID: ${response.Invalidation?.Id}`);
    console.log('⏳ 無効化の完了まで数分かかる場合があります。');
    
  } catch (error) {
    console.error('⚠️  CloudFrontキャッシュの無効化に失敗しました:');
    console.error(error.message);
    console.log('手動でキャッシュを無効化してください。');
  }
}

/**
 * デプロイ情報を表示
 */
function showDeploymentInfo() {
  console.log('');
  console.log('🎉 フロントエンドのデプロイが完了しました！');
  console.log('');
  console.log('📋 デプロイ情報:');
  console.log(`   環境: ${environment}`);
  console.log(`   S3バケット: ${BUCKET_NAME}`);
  
  if (config.cloudFrontUrl) {
    console.log(`   CloudFront URL: ${config.cloudFrontUrl}`);
  }
  if (config.websiteUrl) {
    console.log(`   ウェブサイト URL: ${config.websiteUrl}`);
  }
  
  console.log('');
  console.log('💡 次のステップ:');
  console.log('   1. ウェブサイトにアクセスして動作確認');
  console.log('   2. 必要に応じて初期データを投入');
  console.log(`      npm run setup-data:${environment}`);
}

/**
 * メイン処理
 */
async function main() {
  const startTime = Date.now();
  
  console.log('🚀 フロントエンドデプロイスクリプト');
  console.log(`環境: ${environment}`);
  console.log('');
  
  try {
    // ビルドディレクトリの存在確認
    if (!fs.existsSync(FRONTEND_DIR)) {
      console.error(`❌ フロントエンドディレクトリが見つかりません: ${FRONTEND_DIR}`);
      process.exit(1);
    }
    
    // 強制再ビルドオプション
    if (process.argv.includes('--build') || !fs.existsSync(DIST_DIR)) {
      await buildFrontend();
    } else {
      console.log('📁 既存のビルドファイルを使用します。');
      console.log('   再ビルドする場合は --build オプションを使用してください。');
    }
    
    // S3バケットをクリア（--no-clear オプションがない場合）
    if (!process.argv.includes('--no-clear')) {
      await clearS3Bucket();
    }
    
    // S3にアップロード
    await uploadToS3();
    
    // CloudFrontキャッシュを無効化（--no-invalidate オプションがない場合）
    if (!process.argv.includes('--no-invalidate')) {
      await invalidateCloudFront();
    }
    
    // デプロイ情報を表示
    showDeploymentInfo();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  実行時間: ${duration}秒`);
    
  } catch (error) {
    console.error('❌ デプロイに失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  buildFrontend,
  uploadToS3,
  invalidateCloudFront,
};