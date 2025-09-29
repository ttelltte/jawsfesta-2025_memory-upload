#!/usr/bin/env node

/**
 * フロントエンドをビルドしてS3にデプロイするスクリプト
 * 
 * 使用方法:
 * node deploy-frontend.js [環境名] [--build]
 * 
 * 例:
 * node deploy-frontend.js dev --build
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
const shouldBuild = process.argv.includes('--build');

console.log('🚀 フロントエンドデプロイスクリプト');
console.log(`環境: ${environment}`);

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

// パス設定
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');

/**
 * CDK出力ファイルからS3バケット名を取得
 */
function getBucketNameFromCdkOutput(environment) {
  const outputFile = path.join(__dirname, '..', `cdk-outputs-${environment}.json`);
  
  if (!fs.existsSync(outputFile)) {
    console.error(`❌ CDK出力ファイルが見つかりません: ${outputFile}`);
    console.error('まずCDKデプロイを実行してください:');
    console.error(`  npm run deploy:${environment}`);
    process.exit(1);
  }
  
  try {
    const outputs = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const stackName = Object.keys(outputs)[0]; // 最初のスタック名を取得
    const bucketName = outputs[stackName]?.PhotosBucketName;
    
    if (!bucketName) {
      console.error('❌ S3バケット名がCDK出力に見つかりません。');
      console.error('CDKデプロイが正常に完了していることを確認してください。');
      process.exit(1);
    }
    
    console.log(`✅ S3バケット名を取得: ${bucketName}`);
    return bucketName;
    
  } catch (error) {
    console.error('❌ CDK出力ファイルの解析に失敗しました:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * AWS CLIでスタック出力からS3バケット名を取得（フォールバック）
 */
function getBucketNameFromStack(environment) {
  // スタック名を構築（CDKのネーミング規則に合わせる）
  const stackName = config.stackName || `JawsFestaMemoryUpload${environment.charAt(0).toUpperCase() + environment.slice(1)}`;
  
  try {
    console.log(`🔍 スタック出力からバケット名を取得中: ${stackName}`);
    
    const result = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text`,
      { encoding: 'utf8' }
    ).trim();
    
    if (!result || result === 'None') {
      throw new Error(`S3バケット名がスタック出力に見つかりません`);
    }
    
    console.log(`✅ S3バケット名を取得: ${result}`);
    return result;
    
  } catch (error) {
    console.error('❌ スタック出力の取得に失敗しました:');
    console.error(error.message);
    console.error('\n以下を確認してください:');
    console.error('1. CDKデプロイが正常に完了している');
    console.error('2. AWS認証情報が正しく設定されている');
    console.error('3. スタック名が正しい');
    process.exit(1);
  }
}

/**
 * S3バケット名を取得（AWS CLIから直接取得）
 */
function getBucketName(environment) {
  console.log('🔍 AWS CLIからS3バケット名を取得中...');
  return getBucketNameFromStack(environment);
}

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
    
    // CDK出力から実際のURLを取得する場合の処理
    if (config.apiGatewayUrl) {
      env.VITE_API_URL = config.apiGatewayUrl;
    }
    if (config.cloudFrontUrl) {
      env.VITE_CLOUDFRONT_URL = config.cloudFrontUrl;
    }
    
    // npm install（必要に応じて）
    console.log('📦 依存関係を確認中...');
    execSync('npm install', { 
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
async function clearS3Bucket(bucketName) {
  console.log('🗑️  S3バケットの既存ファイルをクリア中...');
  
  try {
    // 既存オブジェクトの一覧を取得
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: '', // 全てのオブジェクト
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('📭 S3バケットは既に空です。');
      return;
    }
    
    // images/フォルダ（ユーザー投稿画像）とassets/フォルダ（サイトアセット）以外をフィルタリング
    const objectsToDelete = listResponse.Contents.filter(object => {
      return object.Key && !object.Key.startsWith('images/') && !object.Key.startsWith('assets/');
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
          Bucket: bucketName,
          Key: object.Key,
        });
        
        await s3Client.send(deleteCommand);
        console.log(`   削除: ${object.Key}`);
      }
    }
    
    // 保持されたファイルの数を表示
    const preservedCount = listResponse.Contents.length - objectsToDelete.length;
    if (preservedCount > 0) {
      const imagesCount = listResponse.Contents.filter(obj => obj.Key && obj.Key.startsWith('images/')).length;
      const assetsCount = listResponse.Contents.filter(obj => obj.Key && obj.Key.startsWith('assets/')).length;
      console.log(`📷 images/フォルダ内の ${imagesCount} 個のファイルを保持しました。`);
      console.log(`🎨 assets/フォルダ内の ${assetsCount} 個のファイルを保持しました。`);
    }
    
    console.log('✅ S3バケットのクリアが完了しました。');
    
  } catch (error) {
    console.error('❌ S3バケットのクリアに失敗しました:');
    
    if (error.name === 'NoSuchBucket') {
      console.error(`バケット '${bucketName}' が見つかりません。`);
      console.error('CDK デプロイが完了していることを確認してください。');
    } else if (error.name === 'AccessDenied') {
      console.error('アクセスが拒否されました。以下を確認してください:');
      console.error('1. AWS認証情報が正しく設定されている');
      console.error('2. S3バケットへの削除権限がある');
      console.error('3. バケット名が正しい');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}



/**
 * ファイルをS3にアップロード（変更チェック付き、順序最適化）
 */
async function uploadToS3(bucketName) {
  console.log('☁️  S3にファイルをアップロード中...');
  
  try {
    // ビルドされたファイルの一覧を取得
    const files = getFilesRecursively(DIST_DIR);
    
    if (files.length === 0) {
      console.error('❌ ビルドされたファイルが見つかりません。');
      console.error('先にフロントエンドをビルドしてください: --build オプションを使用');
      process.exit(1);
    }
    
    // サイト画像のみ除外、JS/CSSはアップロード
    const filesToUpload = files.filter(f => {
      // assets/フォルダのJS/CSSはアップロード
      if (f.s3Key.startsWith('assets/') && f.s3Key.match(/\.(js|css)$/)) return true;
      // assets/フォルダの画像は除外
      if (f.s3Key.startsWith('assets/')) return false;
      // images/フォルダのサイト画像を除外
      if (f.s3Key.startsWith('images/') && 
          (f.s3Key.includes('JAWS') || f.s3Key.includes('background'))) return false;
      return true;
    });
    
    // アップロード順序: HTML最後（断を最小化）
    const htmlFiles = filesToUpload.filter(f => f.s3Key === 'index.html');
    const otherFiles = filesToUpload.filter(f => f.s3Key !== 'index.html');
    const orderedFiles = [...otherFiles, ...htmlFiles];
    
    console.log(`📁 ${filesToUpload.length} 個のファイルをアップロード中... (サイト画像はスキップ)`);
    
    // 各ファイルをアップロード
    for (const file of orderedFiles) {
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
        Bucket: bucketName,
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
    
    console.log(`✅ S3へのアップロードが完了しました。`);
    
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
    // CDK出力からDistribution IDを取得
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
function showDeploymentInfo(bucketName) {
  console.log('');
  console.log('🎉 フロントエンドのデプロイが完了しました！');
  console.log('');
  console.log('📋 デプロイ情報:');
  console.log(`   環境: ${environment}`);
  console.log(`   S3バケット: ${bucketName}`);
  
  if (config.cloudFrontUrl) {
    console.log(`   CloudFront URL: ${config.cloudFrontUrl}`);
  }
  if (config.websiteUrl) {
    console.log(`   ウェブサイト URL: ${config.websiteUrl}`);
  }
  
  console.log('');
  console.log('💡 次のステップ:');
  console.log('   1. ウェブサイトにアクセスして動作確認');
  console.log('   2. 必要に応じてCloudFrontキャッシュの無効化完了を待つ');
  console.log('   3. 画像アップロード機能のテスト');
  console.log('');
}

/**
 * メイン処理
 */
async function main() {
  try {
    // S3バケット名を取得
    const bucketName = getBucketName(environment);
    
    // ビルドが必要な場合
    if (shouldBuild) {
      await buildFrontend();
    } else {
      console.log('📁 既存のビルドファイルを使用します。');
      console.log('   再ビルドする場合は --build オプションを使用してください。');
      
      // distディレクトリの存在確認
      if (!fs.existsSync(DIST_DIR)) {
        console.error('❌ ビルドファイルが見つかりません。');
        console.error('--build オプションを使用してビルドしてください。');
        process.exit(1);
      }
    }
    
    // デプロイ処理
    await clearS3Bucket(bucketName);
    await uploadToS3(bucketName);
    await invalidateCloudFront();
    
    // デプロイ情報表示
    showDeploymentInfo(bucketName);
    
  } catch (error) {
    console.error('❌ デプロイ処理でエラーが発生しました:');
    console.error(error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();