const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// DynamoDB クライアントを初期化
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// SNS クライアントを初期化
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

/**
 * 削除リクエストを受け付けてSNS通知を送信するLambda関数
 */
exports.handler = async (event) => {
  console.log('Delete Request Lambda function started');
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
    
    // リクエストボディのパース
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid JSON in request body'
          }
        })
      };
    }
    
    // リクエストバリデーション
    const { photoId, deleteReason } = requestBody;
    
    if (!photoId || typeof photoId !== 'string' || photoId.trim() === '') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'photoId is required and must be a non-empty string'
          }
        })
      };
    }
    
    // 削除理由は任意だが、提供された場合は文字列であることを確認
    if (deleteReason !== undefined && typeof deleteReason !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'deleteReason must be a string if provided'
          }
        })
      };
    }
    
    // 環境変数の確認
    const photosTableName = process.env.PHOTOS_TABLE_NAME;
    const snsTopicArn = process.env.DELETE_REQUEST_TOPIC_ARN;
    const photosBucketName = process.env.PHOTOS_BUCKET_NAME;
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const websiteUrl = process.env.WEBSITE_URL;
    
    if (!photosTableName) {
      throw new Error('PHOTOS_TABLE_NAME environment variable is not set');
    }
    if (!snsTopicArn) {
      throw new Error('DELETE_REQUEST_TOPIC_ARN environment variable is not set');
    }
    
    console.log(`Getting photo metadata from table: ${photosTableName}`);
    
    // DynamoDB から画像メタデータを取得
    const getCommand = new GetCommand({
      TableName: photosTableName,
      Key: {
        PK: `PHOTO#${photoId}`,
        SK: 'METADATA'
      }
    });
    
    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      console.log(`Photo not found: ${photoId}`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'PHOTO_NOT_FOUND',
            message: 'Photo not found'
          }
        })
      };
    }
    
    const photoMetadata = result.Item;
    console.log('Photo metadata retrieved:', JSON.stringify(photoMetadata, null, 2));
    
    // リクエスト時刻を生成
    const requestTime = new Date().toISOString();
    
    // 画像URLの生成
    let imageUrl = '';
    if (cloudfrontDomain && photoMetadata.s3Key) {
      imageUrl = `https://${cloudfrontDomain}/${photoMetadata.s3Key}`;
    } else if (photosBucketName && photoMetadata.s3Key) {
      imageUrl = `https://${photosBucketName}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${photoMetadata.s3Key}`;
    }
    
    // 管理者画面URLの生成
    let adminUrl = '';
    if (websiteUrl && adminPassword) {
      const params = new URLSearchParams({
        admin: adminPassword,
        photoId: photoId,
        deleteReason: deleteReason || '理由なし',
        requestTime: requestTime
      });
      adminUrl = `${websiteUrl}?${params.toString()}`;
    } else if (cloudfrontDomain && adminPassword) {
      const params = new URLSearchParams({
        admin: adminPassword,
        photoId: photoId,
        deleteReason: deleteReason || '理由なし',
        requestTime: requestTime
      });
      adminUrl = `https://${cloudfrontDomain}?${params.toString()}`;
    }
    
    // SNS通知メッセージの作成（人間が読みやすい形式）
    const requestTimeJST = new Date(requestTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
    
    const uploadTimeJST = new Date(photoMetadata.uploadTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
    
    const messageText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
画像削除リクエスト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【管理者操作URL】
${adminUrl}

※上記URLをクリックすると、管理者画面で該当画像の編集ダイアログが自動で開きます

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【削除理由】
${deleteReason || '理由なし'}

【投稿者】
${photoMetadata.uploaderName || '匿名'}

【リクエスト日時】
${requestTimeJST}

【画像情報】
- アップロード日時: ${uploadTimeJST}
- コメント: ${photoMetadata.comment || 'なし'}
- 画像URL: ${imageUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    
    // SNS通知の送信
    console.log('Sending SNS notification to:', snsTopicArn);
    
    const publishCommand = new PublishCommand({
      TopicArn: snsTopicArn,
      Subject: `[JAWS FESTA] 画像削除リクエスト - ${photoMetadata.uploaderName || '匿名'}`,
      Message: messageText
    });
    
    await snsClient.send(publishCommand);
    
    console.log('SNS notification sent successfully');
    
    // レスポンスを返す
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '削除リクエストを送信しました。管理者が確認後、対応いたします。'
      })
    };
    
  } catch (error) {
    console.error('Error in delete request handler:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: process.env.LOG_LEVEL === 'DEBUG' ? error.message : undefined
        }
      })
    };
  }
};
