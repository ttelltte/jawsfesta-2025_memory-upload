const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// AWS クライアントを初期化
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

/**
 * 管理者認証チェック
 */
const validateAdmin = (event) => {
  const adminParam = event.queryStringParameters?.admin;
  const adminPassword = process.env.ADMIN_PASSWORD || '19931124';
  
  if (adminParam !== adminPassword) {
    throw new Error('Unauthorized: Invalid admin credentials');
  }
};

/**
 * 画像削除を処理するLambda関数
 */
exports.handler = async (event) => {
  console.log('Delete Photo Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
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
    
    // DELETE リクエストの処理
    if (event.httpMethod !== 'DELETE') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only DELETE method is allowed'
          }
        })
      };
    }
    
    // 管理者認証チェック
    validateAdmin(event);
    
    // 環境変数の確認
    const photosTableName = process.env.PHOTOS_TABLE_NAME;
    const bucketName = process.env.PHOTOS_BUCKET_NAME;
    
    if (!photosTableName || !bucketName) {
      throw new Error('Required environment variables are not set');
    }
    
    // photoId の取得
    const photoId = event.pathParameters?.photoId;
    if (!photoId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_PHOTO_ID',
            message: 'Photo ID is required'
          }
        })
      };
    }
    
    console.log(`Deleting photo: ${photoId}`);
    
    // DynamoDB から画像情報を取得
    const getCommand = new GetCommand({
      TableName: photosTableName,
      Key: {
        PK: `PHOTO#${photoId}`,
        SK: 'METADATA'
      }
    });
    
    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '画像が見つかりません'
          }
        })
      };
    }
    
    const photoData = result.Item;
    console.log('Photo data found:', photoData);
    
    // S3から画像を削除
    try {
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: photoData.s3Key
      });
      
      await s3Client.send(deleteObjectCommand);
      console.log(`S3 object deleted: ${photoData.s3Key}`);
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      // S3削除エラーでも処理を続行（DynamoDBからは削除）
    }
    
    // DynamoDB からレコードを削除
    const deleteCommand = new DeleteCommand({
      TableName: photosTableName,
      Key: {
        PK: `PHOTO#${photoId}`,
        SK: 'METADATA'
      }
    });
    
    await docClient.send(deleteCommand);
    console.log('DynamoDB record deleted');
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '画像が削除されました'
      })
    };
    
  } catch (error) {
    console.error('Error in delete photo handler:', error);
    
    // 認証エラーの場合
    if (error.message.includes('Unauthorized')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized access'
          }
        })
      };
    }
    
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