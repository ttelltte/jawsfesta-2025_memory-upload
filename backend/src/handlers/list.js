const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// AWS クライアントを初期化
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

/**
 * 画像一覧を取得するLambda関数
 */
exports.handler = async (event) => {
  console.log('List Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };
  
  try {
    // OPTIONS リクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'OK' })
      };
    }
    
    // GET リクエストの処理
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only GET method is allowed'
          }
        })
      };
    }
    
    // 環境変数の確認
    const photosTableName = process.env.PHOTOS_TABLE_NAME;
    const bucketName = process.env.PHOTOS_BUCKET_NAME;
    
    if (!photosTableName || !bucketName) {
      throw new Error('Required environment variables are not set');
    }
    
    console.log(`Getting photos from table: ${photosTableName}`);
    
    // DynamoDB から画像メタデータを取得
    const scanCommand = new ScanCommand({
      TableName: photosTableName,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PHOTO#'
      }
    });
    
    const result = await docClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      console.log('No photos found');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            photos: [],
            count: 0
          }
        })
      };
    }
    
    console.log(`Found ${result.Items.length} photos`);
    
    // 新着順でソート（uploadTimeUnix の降順）
    const sortedItems = result.Items.sort((a, b) => b.uploadTimeUnix - a.uploadTimeUnix);
    
    // S3 Presigned URL を生成
    const photos = await Promise.all(
      sortedItems.map(async (item) => {
        try {
          // Presigned URL を生成（1時間有効）
          const getObjectCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: item.s3Key
          });
          
          const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
            expiresIn: 3600 // 1時間
          });
          
          return {
            id: item.id,
            s3Key: item.s3Key,
            uploaderName: item.uploaderName,
            comment: item.comment,
            uploadTime: item.uploadTime,
            uploadTimeUnix: item.uploadTimeUnix,
            presignedUrl: presignedUrl
          };
        } catch (error) {
          console.error(`Error generating presigned URL for ${item.s3Key}:`, error);
          return null;
        }
      })
    );
    
    // null を除外
    const validPhotos = photos.filter(photo => photo !== null);
    
    console.log(`Generated presigned URLs for ${validPhotos.length} photos`);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          photos: validPhotos,
          count: validPhotos.length
        }
      })
    };
    
  } catch (error) {
    console.error('Error in list handler:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      })
    };
  }
};