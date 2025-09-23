const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');



// AWS クライアントを初期化
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

/**
 * Base64データをBufferに変換
 */
function base64ToBuffer(base64Data) {
  // data:image/jpeg;base64, のプレフィックスを除去
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64String, 'base64');
}

/**
 * ファイル名を生成
 */
function generateFileName(uploaderName, originalName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalName ? originalName.split('.').pop() : 'jpg';

  const safeName = uploaderName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');

  return `${safeName}_${timestamp}_${randomId}.${extension}`;
}

/**
 * 画像アップロードを処理するLambda関数
 */
exports.handler = async (event) => {
  console.log('Upload Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));

  // CORS ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

    // POST リクエストの処理
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only POST method is allowed'
          }
        })
      };
    }

    // 環境変数の確認
    const photosTableName = process.env.PHOTOS_TABLE_NAME;
    const configTableName = process.env.CONFIG_TABLE_NAME;
    const bucketName = process.env.PHOTOS_BUCKET_NAME;

    if (!photosTableName || !configTableName || !bucketName) {
      throw new Error('Required environment variables are not set');
    }

    // リクエストボディの解析
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
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

    // 必須フィールドの確認
    const { imageData, uploaderName, comment, checkedItems } = requestBody;

    if (!imageData) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_IMAGE',
            message: 'Image data is required'
          }
        })
      };
    }

    if (!checkedItems || !Array.isArray(checkedItems)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_CHECKED_ITEMS',
            message: 'Checked items are required'
          }
        })
      };
    }

    // 確認項目の設定を取得
    console.log('Getting config from table:', configTableName);
    const getConfigCommand = new GetCommand({
      TableName: configTableName,
      Key: {
        PK: 'CONFIG',
        SK: 'UPLOAD_CHECKLIST'
      }
    });

    const configResult = await docClient.send(getConfigCommand);

    if (!configResult.Item) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'CONFIG_NOT_FOUND',
            message: 'Upload configuration not found'
          }
        })
      };
    }

    // 必須項目のチェック
    const requiredItems = configResult.Item.items.filter(item => item.required);
    const missingItems = requiredItems.filter(item => !checkedItems.includes(item.id));

    if (missingItems.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_ITEMS',
            message: 'All required items must be checked',
            details: {
              missingItems: missingItems.map(item => item.text)
            }
          }
        })
      };
    }

    // 画像データの処理
    let imageBuffer;
    try {
      imageBuffer = base64ToBuffer(imageData);
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_IMAGE_DATA',
            message: 'Invalid image data format'
          }
        })
      };
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxSize) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit',
            details: {
              maxSize: '10MB',
              actualSize: `${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`
            }
          }
        })
      };
    }

    // ユニークIDとファイル名を生成
    const photoId = uuidv4();
    const safeUploaderName = uploaderName || 'Anonymous';
    const fileName = generateFileName(safeUploaderName, 'image.jpg');
    const s3Key = `images/${fileName}`;

    console.log(`Uploading image: ${s3Key}`);

    // Content-Typeを推定（Base64データから）
    const getContentTypeFromBase64 = (base64Data) => {
      if (base64Data.startsWith('data:image/jpeg')) return 'image/jpeg';
      if (base64Data.startsWith('data:image/png')) return 'image/png';
      if (base64Data.startsWith('data:image/gif')) return 'image/gif';
      if (base64Data.startsWith('data:image/webp')) return 'image/webp';
      return 'image/jpeg'; // デフォルト
    };

    // S3に画像をアップロード
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: getContentTypeFromBase64(imageData),
      ServerSideEncryption: 'AES256'
    });

    await s3Client.send(putObjectCommand);

    console.log('Image uploaded to S3 successfully');

    // DynamoDBにメタデータを保存
    const now = new Date();
    const uploadTime = now.toISOString();
    const uploadTimeUnix = now.getTime();
    const ttl = Math.floor((now.getTime() + (30 * 24 * 60 * 60 * 1000)) / 1000); // 30日後

    const putItemCommand = new PutCommand({
      TableName: photosTableName,
      Item: {
        PK: `PHOTO#${photoId}`,
        SK: 'METADATA',
        id: photoId,
        s3Key: s3Key,
        uploaderName: safeUploaderName,
        comment: comment || '',
        uploadTime: uploadTime,
        uploadTimeUnix: uploadTimeUnix,
        ttl: ttl
      }
    });

    await docClient.send(putItemCommand);

    console.log('Metadata saved to DynamoDB successfully');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          id: photoId,
          uploaderName: safeUploaderName,
          comment: comment || '',
          uploadTime: uploadTime
        }
      })
    };

  } catch (error) {
    console.error('Error in upload handler:', error);

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