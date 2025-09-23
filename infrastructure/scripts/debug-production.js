#!/usr/bin/env node

/**
 * 本番環境の問題をデバッグするスクリプト
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// 設定読み込み
const config = require('../config/prod.json');

// AWS クライアント初期化
const dynamoClient = new DynamoDBClient({
  region: config.region || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: config.region || 'ap-northeast-1'
});

async function debugProduction() {
  console.log('🔍 本番環境デバッグ開始...\n');

  try {
    // 1. DynamoDBテーブルの確認
    console.log('📊 DynamoDB テーブル確認');
    await checkDynamoDBTables();

    // 2. S3バケットの確認
    console.log('\n📦 S3 バケット確認');
    await checkS3Bucket();

    // 3. 画像データの確認
    console.log('\n🖼️ 画像データ確認');
    await checkImageData();

    // 4. Presigned URL生成テスト
    console.log('\n🔗 Presigned URL 生成テスト');
    await testPresignedUrls();

  } catch (error) {
    console.error('❌ デバッグ中にエラーが発生しました:', error);
  }
}

async function checkDynamoDBTables() {
  try {
    const photosTableName = process.env.PHOTOS_TABLE_NAME || 'JawsFestaMemoryUploadProd-PhotosTable';
    
    console.log(`  テーブル名: ${photosTableName}`);
    
    const scanCommand = new ScanCommand({
      TableName: photosTableName,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PHOTO#'
      },
      Limit: 5 // 最初の5件のみ
    });
    
    const result = await docClient.send(scanCommand);
    
    console.log(`  ✅ 画像レコード数: ${result.Items?.length || 0}`);
    
    if (result.Items && result.Items.length > 0) {
      const sample = result.Items[0];
      console.log('  📋 サンプルレコード:');
      console.log(`    ID: ${sample.id}`);
      console.log(`    S3キー: ${sample.s3Key}`);
      console.log(`    投稿者: ${sample.uploaderName}`);
      console.log(`    アップロード時刻: ${sample.uploadTime}`);
      console.log(`    Unix時刻: ${sample.uploadTimeUnix}`);
      
      // 日本時間での表示
      const jstTime = new Date(sample.uploadTime).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      console.log(`    日本時間: ${jstTime}`);
    }
    
  } catch (error) {
    console.error('  ❌ DynamoDB確認エラー:', error.message);
  }
}

async function checkS3Bucket() {
  try {
    const bucketName = process.env.PHOTOS_BUCKET_NAME || 'jawsfestamemoryuploadprod-photosbucket';
    
    console.log(`  バケット名: ${bucketName}`);
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'images/',
      MaxKeys: 10
    });
    
    const result = await s3Client.send(listCommand);
    
    console.log(`  ✅ 画像ファイル数: ${result.Contents?.length || 0}`);
    
    if (result.Contents && result.Contents.length > 0) {
      console.log('  📋 サンプルファイル:');
      result.Contents.slice(0, 3).forEach((obj, index) => {
        console.log(`    ${index + 1}. ${obj.Key} (${Math.round(obj.Size / 1024)}KB)`);
      });
    }
    
  } catch (error) {
    console.error('  ❌ S3確認エラー:', error.message);
  }
}

async function checkImageData() {
  try {
    const photosTableName = process.env.PHOTOS_TABLE_NAME || 'JawsFestaMemoryUploadProd-PhotosTable';
    const bucketName = process.env.PHOTOS_BUCKET_NAME || 'jawsfestamemoryuploadprod-photosbucket';
    
    const scanCommand = new ScanCommand({
      TableName: photosTableName,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PHOTO#'
      },
      Limit: 3
    });
    
    const result = await docClient.send(scanCommand);
    
    if (result.Items && result.Items.length > 0) {
      for (const item of result.Items) {
        console.log(`\n  🖼️ 画像ID: ${item.id}`);
        console.log(`    S3キー: ${item.s3Key}`);
        console.log(`    投稿者: ${item.uploaderName}`);
        console.log(`    コメント: ${item.comment || '(なし)'}`);
        
        // S3オブジェクトの存在確認
        try {
          const headCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: item.s3Key
          });
          
          // オブジェクトの存在確認（実際にダウンロードはしない）
          await s3Client.send(headCommand);
          console.log(`    ✅ S3オブジェクト存在: はい`);
          
        } catch (s3Error) {
          console.log(`    ❌ S3オブジェクト存在: いいえ (${s3Error.name})`);
        }
      }
    }
    
  } catch (error) {
    console.error('  ❌ 画像データ確認エラー:', error.message);
  }
}

async function testPresignedUrls() {
  try {
    const photosTableName = process.env.PHOTOS_TABLE_NAME || 'JawsFestaMemoryUploadProd-PhotosTable';
    const bucketName = process.env.PHOTOS_BUCKET_NAME || 'jawsfestamemoryuploadprod-photosbucket';
    
    const scanCommand = new ScanCommand({
      TableName: photosTableName,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PHOTO#'
      },
      Limit: 1
    });
    
    const result = await docClient.send(scanCommand);
    
    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      
      try {
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: item.s3Key
        });
        
        const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600 // 1時間
        });
        
        console.log(`  ✅ Presigned URL生成成功`);
        console.log(`    URL: ${presignedUrl.substring(0, 100)}...`);
        
        // URLの有効性をテスト
        const response = await fetch(presignedUrl, { method: 'HEAD' });
        console.log(`    ✅ URL有効性: ${response.ok ? 'OK' : 'NG'} (${response.status})`);
        
      } catch (urlError) {
        console.error(`  ❌ Presigned URL生成エラー:`, urlError.message);
      }
    } else {
      console.log('  ⚠️ テスト用の画像データが見つかりません');
    }
    
  } catch (error) {
    console.error('  ❌ Presigned URLテストエラー:', error.message);
  }
}

// 環境変数の設定
process.env.AWS_REGION = config.region || 'ap-northeast-1';

// スクリプト実行
if (require.main === module) {
  debugProduction().then(() => {
    console.log('\n✅ デバッグ完了');
  }).catch(error => {
    console.error('\n❌ デバッグ失敗:', error);
    process.exit(1);
  });
}

module.exports = { debugProduction };