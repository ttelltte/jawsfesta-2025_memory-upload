const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
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
 * 管理者認証チェック
 */
const validateAdmin = (event) => {
  const adminParam = event.queryStringParameters?.admin;
  const adminPassword = process.env.ADMIN_PASSWORD || '19931124';
  
  if (adminParam !== adminPassword) {
    throw new Error('Unauthorized: Invalid admin credentials');
  }
};

// Sharp ライブラリを追加
const sharp = require('sharp');

/**
 * 画像回転処理
 */
const rotateImage = async (bucketName, s3Key, rotation) => {
  console.log(`Image rotation requested: ${rotation} degrees for ${s3Key}`);
  
  try {
    // S3から画像をダウンロード
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    
    const response = await s3Client.send(getObjectCommand);
    const imageBuffer = Buffer.from(await response.Body.transformToByteArray());
    
    console.log(`Downloaded image from S3: ${s3Key}, size: ${imageBuffer.length} bytes`);
    
    // Sharp で画像を回転
    const rotatedBuffer = await sharp(imageBuffer)
      .rotate(rotation)
      .jpeg({ quality: 90 }) // JPEG品質を90%に設定
      .toBuffer();
    
    console.log(`Image rotated: ${rotation} degrees, new size: ${rotatedBuffer.length} bytes`);
    
    // 回転後の画像をS3にアップロード（元のファイルを上書き）
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: rotatedBuffer,
      ContentType: response.ContentType || 'image/jpeg',
      ServerSideEncryption: 'AES256'
    });
    
    await s3Client.send(putObjectCommand);
    console.log(`Rotated image uploaded to S3: ${s3Key}`);
    
    return true;
  } catch (error) {
    console.error('Error in image rotation:', error);
    throw error;
  }
};

/**
 * 画像情報更新を処理するLambda関数
 */
exports.handler = async (event) => {
  console.log('Update Photo Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
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
    
    // PATCH リクエストの処理
    if (event.httpMethod !== 'PATCH') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only PATCH method is allowed'
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
    
    // リクエストボディの解析
    let updates;
    try {
      updates = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body'
          }
        })
      };
    }
    
    console.log(`Updating photo: ${photoId}`, updates);
    
    // DynamoDB から現在の画像情報を取得
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
    
    const currentPhoto = result.Item;
    console.log('Current photo data:', currentPhoto);
    
    // 画像回転処理
    if (updates.rotation && updates.rotation !== 0) {
      try {
        await rotateImage(bucketName, currentPhoto.s3Key, updates.rotation);
        console.log(`Image rotated: ${updates.rotation} degrees`);
      } catch (rotationError) {
        console.error('Error rotating image:', rotationError);
        // 回転エラーでも処理を続行（メタデータ更新は実行）
      }
    }
    
    // DynamoDB メタデータ更新
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    if (updates.uploaderName !== undefined) {
      updateExpressions.push('#uploaderName = :uploaderName');
      expressionAttributeNames['#uploaderName'] = 'uploaderName';
      expressionAttributeValues[':uploaderName'] = updates.uploaderName;
    }
    
    if (updates.comment !== undefined) {
      updateExpressions.push('#comment = :comment');
      expressionAttributeNames['#comment'] = 'comment';
      expressionAttributeValues[':comment'] = updates.comment;
    }
    
    // 更新する項目がある場合のみ DynamoDB を更新
    if (updateExpressions.length > 0) {
      const updateCommand = new UpdateCommand({
        TableName: photosTableName,
        Key: {
          PK: `PHOTO#${photoId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      });
      
      const updateResult = await docClient.send(updateCommand);
      console.log('DynamoDB record updated');
      
      // 更新後のデータを取得
      const updatedPhoto = updateResult.Attributes;
      
      // Presigned URL を生成
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: updatedPhoto.s3Key
      });
      
      const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600 // 1時間
      });
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            id: updatedPhoto.id,
            uploaderName: updatedPhoto.uploaderName,
            comment: updatedPhoto.comment,
            uploadTime: updatedPhoto.uploadTime,
            uploadTimeUnix: updatedPhoto.uploadTimeUnix,
            presignedUrl: presignedUrl
          }
        })
      };
    } else {
      // 更新項目がない場合（回転のみの場合）
      // Presigned URL を生成
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: currentPhoto.s3Key
      });
      
      const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600 // 1時間
      });
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            id: currentPhoto.id,
            uploaderName: currentPhoto.uploaderName,
            comment: currentPhoto.comment,
            uploadTime: currentPhoto.uploadTime,
            uploadTimeUnix: currentPhoto.uploadTimeUnix,
            presignedUrl: presignedUrl
          }
        })
      };
    }
    
  } catch (error) {
    console.error('Error in update photo handler:', error);
    
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